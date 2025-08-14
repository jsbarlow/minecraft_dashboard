--[[
  ComputerCraft Dashboard Client
  
  This script connects a ComputerCraft computer to your dashboard server
  using HTTP requests (since ComputerCraft doesn't have WebSocket support).
  
  Installation:
  1. Place this file on your ComputerCraft computer
  2. Edit the SERVER_URL to match your server
  3. Run: lua computercraft_client.lua
  
  Features:
  - Automatic registration with dashboard
  - Send status updates
  - Receive and execute commands
  - Error handling and reconnection
--]]

-- Configuration
-- CHANGE THIS TO YOUR DEPLOYED SERVER URL
local SERVER_URL = "http://localhost:8080"  -- Change to your hosted server URL
-- Examples:
-- local SERVER_URL = "https://your-app.railway.app"
-- local SERVER_URL = "https://your-app.onrender.com"
-- local SERVER_URL = "https://your-app.fly.dev"

local COMPUTER_NAME = "ComputerCraft_" .. os.getComputerID()
local UPDATE_INTERVAL = 30  -- Status update interval in seconds
local RETRY_DELAY = 60     -- Retry connection after failure (seconds)
local MAX_RETRIES = 5      -- Maximum connection retries before giving up

-- Global state
local isRunning = true
local registeredFunctions = {}
local currentTask = "Idle"
local connectionAttempts = 0
local lastSuccessfulConnection = 0

-- Helper function to make HTTP requests with retry logic
local function httpRequest(method, endpoint, data)
    local url = SERVER_URL .. endpoint
    local headers = {
        ["Content-Type"] = "application/json",
        ["User-Agent"] = "ComputerCraft-Tweaked/" .. os.version()
    }
    
    local postData = nil
    if data then
        postData = textutils.serializeJSON(data)
    end
    
    -- Attempt request with timeout
    local response
    local success = false
    
    -- Use pcall to handle network errors gracefully
    local requestSuccess, result = pcall(function()
        if method == "GET" then
            return http.get(url, headers, false, 10) -- 10 second timeout
        elseif method == "POST" then
            return http.post(url, postData, headers, false, 10) -- 10 second timeout
        end
    end)
    
    if requestSuccess and result then
        response = result
        local content = response.readAll()
        response.close()
        
        if content and content ~= "" then
            local parseSuccess, parsedResult = pcall(textutils.unserialiseJSON, content)
            if parseSuccess and parsedResult then
                lastSuccessfulConnection = os.epoch("utc")
                connectionAttempts = 0 -- Reset retry counter on success
                return parsedResult
            end
        end
    else
        print("❌ Network error: " .. (result or "Unknown error"))
    end
    
    return nil
end

-- Test server connectivity
local function testConnection()
    print("🔍 Testing server connectivity...")
    local health = httpRequest("GET", "/health")
    if health and health.status == "healthy" then
        print("✅ Server is reachable and healthy")
        return true
    else
        print("❌ Server is not reachable or unhealthy")
        return false
    end
end

-- Send a message to the dashboard
local function sendMessage(messageType, messageData)
    local message = {
        id = "cc_" .. os.epoch("utc") .. "_" .. math.random(1000, 9999),
        timestamp = os.epoch("utc"),
        type = messageType,
        source = COMPUTER_NAME
    }
    
    -- Merge message data
    for key, value in pairs(messageData) do
        message[key] = value
    end
    
    local result = httpRequest("POST", "/api/computercraft/message", message)
    if result and result.success then
        print("✅ Sent " .. messageType .. " message")
        return true
    else
        print("❌ Failed to send " .. messageType .. " message")
        return false
    end
end

-- Register this computer with the dashboard
local function registerComputer()
    print("🤖 Registering with dashboard...")
    
    -- Define available functions for this computer
    local functions = {
        {
            name = "sayHello",
            description = "Make the computer say hello",
            parameters = {
                {
                    name = "message",
                    type = "string",
                    required = false,
                    description = "Custom greeting message",
                    defaultValue = "Hello from " .. COMPUTER_NAME .. "!"
                }
            },
            category = "communication"
        },
        {
            name = "getInfo",
            description = "Get computer information",
            parameters = {},
            category = "system"
        },
        {
            name = "setLabel",
            description = "Set computer label",
            parameters = {
                {
                    name = "label",
                    type = "string",
                    required = true,
                    description = "New computer label"
                }
            },
            category = "system"
        }
    }
    
    -- Add turtle-specific functions if this is a turtle
    if turtle then
        table.insert(functions, {
            name = "moveForward",
            description = "Move turtle forward",
            parameters = {
                {
                    name = "distance",
                    type = "number",
                    required = false,
                    description = "Number of blocks to move",
                    defaultValue = 1,
                    min = 1,
                    max = 10
                }
            },
            category = "movement"
        })
        
        table.insert(functions, {
            name = "digForward",
            description = "Dig block in front",
            parameters = {},
            category = "mining"
        })
    end
    
    registeredFunctions = functions
    
    -- Get current status
    local status = {
        position = nil,
        fuel = nil,
        inventorySlots = nil
    }
    
    if turtle then
        local x, y, z = gps.locate()
        if x then
            status.position = {x = x, y = y, z = z}
        end
        status.fuel = turtle.getFuelLevel()
        status.inventorySlots = 16
    end
    
    -- Send registration
    local registrationData = {
        computerName = COMPUTER_NAME,
        computerType = turtle and "turtle" or "computer",
        functions = functions,
        status = status
    }
    
    local result = httpRequest("POST", "/api/computercraft/register", registrationData)
    if result and result.success then
        print("✅ Registration successful!")
        print("📋 Registered " .. #functions .. " functions")
        return true
    else
        print("❌ Registration failed!")
        return false
    end
end

-- Send status update to dashboard
local function sendStatusUpdate()
    local status = {
        isActive = isRunning,
        currentTask = currentTask,
        fuel = nil,
        position = nil,
        inventory = {},
        customData = {
            uptime = math.floor(os.clock()),
            label = os.getComputerLabel() or "Unlabeled",
            id = os.getComputerID()
        }
    }
    
    -- Add turtle-specific status
    if turtle then
        status.fuel = turtle.getFuelLevel()
        
        local x, y, z = gps.locate()
        if x then
            status.position = {x = x, y = y, z = z}
        end
        
        -- Get inventory summary
        for slot = 1, 16 do
            local item = turtle.getItemDetail(slot)
            if item then
                table.insert(status.inventory, {
                    slot = slot,
                    item = item.name,
                    count = item.count
                })
            end
        end
    end
    
    return sendMessage("status_update", {
        computerName = COMPUTER_NAME,
        status = status
    })
end

-- Send a chat message to the dashboard
local function sendChatMessage(content, priority, category)
    return sendMessage("chat", {
        content = content,
        priority = priority or "medium",
        category = category or "system"
    })
end

-- Execute a function based on command
local function executeFunction(functionName, parameters)
    print("⚡ Executing function: " .. functionName)
    
    if functionName == "sayHello" then
        local message = parameters.message or ("Hello from " .. COMPUTER_NAME .. "!")
        print(message)
        sendChatMessage("Computer says: " .. message, "low", "communication")
        return {success = true, result = message}
        
    elseif functionName == "getInfo" then
        local info = {
            id = os.getComputerID(),
            label = os.getComputerLabel(),
            version = os.version(),
            uptime = math.floor(os.clock()),
            isTurtle = turtle ~= nil
        }
        
        if turtle then
            info.fuel = turtle.getFuelLevel()
            local x, y, z = gps.locate()
            if x then
                info.position = {x = x, y = y, z = z}
            end
        end
        
        sendChatMessage("Computer info retrieved", "low", "system")
        return {success = true, result = info}
        
    elseif functionName == "setLabel" then
        local newLabel = parameters.label
        if newLabel then
            os.setComputerLabel(newLabel)
            COMPUTER_NAME = newLabel
            sendChatMessage("Label changed to: " .. newLabel, "medium", "system")
            return {success = true, result = "Label set to " .. newLabel}
        else
            return {success = false, error = "Label parameter required"}
        end
        
    elseif functionName == "moveForward" and turtle then
        local distance = parameters.distance or 1
        local moved = 0
        
        for i = 1, distance do
            if turtle.forward() then
                moved = moved + 1
                currentTask = "Moving forward (" .. moved .. "/" .. distance .. ")"
            else
                break
            end
        end
        
        currentTask = "Idle"
        sendChatMessage("Moved " .. moved .. " blocks forward", moved > 0 and "low" or "high", "movement")
        return {success = moved > 0, result = "Moved " .. moved .. " blocks"}
        
    elseif functionName == "digForward" and turtle then
        if turtle.detect() then
            if turtle.dig() then
                sendChatMessage("Successfully dug block in front", "low", "mining")
                return {success = true, result = "Block dug"}
            else
                sendChatMessage("Failed to dig block in front", "high", "mining")
                return {success = false, error = "Could not dig block"}
            end
        else
            sendChatMessage("No block to dig in front", "medium", "mining")
            return {success = false, error = "No block detected"}
        end
    else
        sendChatMessage("Unknown function: " .. functionName, "high", "system")
        return {success = false, error = "Function not found: " .. functionName}
    end
end

-- Check for commands from dashboard (polling)
local function checkForCommands()
    -- Note: In a real implementation, you might want to use a more efficient
    -- method like long polling or implement a simple queue system on the server
    -- For now, we'll just send periodic status updates
    sendStatusUpdate()
end

-- Connection retry logic
local function attemptConnection()
    connectionAttempts = connectionAttempts + 1
    print("🔄 Connection attempt " .. connectionAttempts .. "/" .. MAX_RETRIES)
    
    -- Test basic connectivity first
    if not testConnection() then
        print("❌ Cannot reach server")
        return false
    end
    
    -- Try to register
    if not registerComputer() then
        print("❌ Failed to register with server")
        return false
    end
    
    return true
end

-- Main loop with connection resilience
local function main()
    print("🚀 ComputerCraft Dashboard Client Starting...")
    print("💻 Computer: " .. COMPUTER_NAME)
    print("🌐 Server: " .. SERVER_URL)
    print("📋 ComputerCraft Tweaked Version: " .. os.version())
    print("")
    
    -- Initial connection with retry logic
    while connectionAttempts < MAX_RETRIES and isRunning do
        if attemptConnection() then
            break
        else
            if connectionAttempts < MAX_RETRIES then
                print("⏳ Retrying in " .. RETRY_DELAY .. " seconds...")
                sleep(RETRY_DELAY)
            end
        end
    end
    
    if connectionAttempts >= MAX_RETRIES then
        print("💥 Max connection attempts reached. Exiting.")
        print("🔧 Check your server URL and network connection.")
        return
    end
    
    -- Send initial status
    sendStatusUpdate()
    sendChatMessage("ComputerCraft computer " .. COMPUTER_NAME .. " is online!", "medium", "system")
    
    print("✅ Connected to dashboard!")
    print("📡 Sending status updates every " .. UPDATE_INTERVAL .. " seconds")
    print("🔄 Connection retry delay: " .. RETRY_DELAY .. " seconds")
    print("🛑 Press Ctrl+T to stop")
    print("")
    
    local lastUpdate = 0
    local lastHealthCheck = 0
    local healthCheckInterval = 120 -- Check server health every 2 minutes
    
    while isRunning do
        local currentTime = os.clock()
        
        -- Send periodic status updates
        if currentTime - lastUpdate >= UPDATE_INTERVAL then
            local statusSent = sendStatusUpdate()
            if not statusSent then
                print("⚠️  Failed to send status update. Server may be down.")
            end
            lastUpdate = currentTime
        end
        
        -- Periodic health check
        if currentTime - lastHealthCheck >= healthCheckInterval then
            if not testConnection() then
                print("⚠️  Lost connection to server. Will retry on next update.")
            end
            lastHealthCheck = currentTime
        end
        
        -- Handle events
        local eventData = {os.pullEventRaw(1)} -- 1 second timeout
        if eventData[1] == "terminate" then
            isRunning = false
        elseif eventData[1] == "timer" then
            -- Timer events can be ignored
        end
    end
    
    -- Send goodbye message
    print("👋 Shutting down...")
    sendChatMessage("ComputerCraft computer " .. COMPUTER_NAME .. " going offline", "medium", "system")
    print("✅ Disconnected from dashboard")
end

-- Error handling wrapper
local function safeMain()
    local success, error = pcall(main)
    if not success then
        print("💥 Error: " .. tostring(error))
        sendChatMessage("ComputerCraft client crashed: " .. tostring(error), "critical", "system")
    end
end

-- Start the client
safeMain()
