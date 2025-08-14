--[[
  ComputerCraft Dashboard Test Script
  
  This script demonstrates how to connect a ComputerCraft computer
  to your dashboard and send various message types.
  
  Instructions:
  1. Install this script on a ComputerCraft computer
  2. Run: lua computercraft_example.lua
  3. The computer will connect to your dashboard and send test messages
  
  Requirements:
  - ComputerCraft with HTTP API enabled
  - A WebSocket server (you'll need to set one up)
--]]

-- Configuration
local DASHBOARD_URL = "ws://localhost:8080"  -- Your dashboard WebSocket URL
local COMPUTER_NAME = "TestComputer_" .. os.getComputerID()

-- Helper function to create a message
local function createMessage(messageType, data)
    local message = {
        id = "cc_" .. os.epoch("utc") .. "_" .. math.random(1000, 9999),
        timestamp = os.epoch("utc"),
        type = messageType,
        source = COMPUTER_NAME
    }
    
    -- Merge the data into the message
    for key, value in pairs(data) do
        message[key] = value
    end
    
    return message
end

-- Function to send API registration (tells dashboard what this computer can do)
local function sendAPIRegistration(ws)
    local apiMessage = createMessage("api_registration", {
        computerName = COMPUTER_NAME,
        computerType = "computer",  -- or "turtle" or "pocket"
        functions = {
            {
                name = "sayHello",
                description = "Make the computer say hello",
                parameters = {
                    {
                        name = "message",
                        type = "string",
                        required = false,
                        description = "Custom message to display",
                        defaultValue = "Hello from ComputerCraft!"
                    }
                },
                category = "communication"
            },
            {
                name = "getMiningStatus",
                description = "Get current mining operation status",
                parameters = {},
                category = "mining"
            },
            {
                name = "moveForward",
                description = "Move the turtle forward",
                parameters = {
                    {
                        name = "distance",
                        type = "number",
                        required = true,
                        description = "Number of blocks to move",
                        min = 1,
                        max = 10
                    }
                },
                category = "movement"
            }
        },
        status = {
            position = {
                x = 100,
                y = 64,
                z = 200
            },
            inventorySlots = 16
        }
    })
    
    ws.send(textutils.serializeJSON(apiMessage))
    print("Sent API registration to dashboard")
end

-- Function to send various test messages
local function sendTestMessages(ws)
    -- Send a welcome chat message
    local welcomeMsg = createMessage("chat", {
        content = "ComputerCraft computer " .. COMPUTER_NAME .. " connected to dashboard!",
        priority = "medium",
        category = "system"
    })
    ws.send(textutils.serializeJSON(welcomeMsg))
    
    sleep(2)
    
    -- Send different priority messages
    local priorities = {"low", "medium", "high", "critical"}
    local messages = {
        "Mining operation started in quarry zone",
        "Found diamond ore at coordinates (150, 12, 220)",
        "WARNING: Low fuel detected - 10% remaining",
        "CRITICAL: Turtle stuck! Manual intervention required!"
    }
    
    for i, priority in ipairs(priorities) do
        local chatMsg = createMessage("chat", {
            content = messages[i],
            priority = priority,
            category = i <= 2 and "mining" or "system"
        })
        ws.send(textutils.serializeJSON(chatMsg))
        print("Sent " .. priority .. " priority message")
        sleep(3)
    end
    
    -- Send a status update
    local statusMsg = createMessage("status_update", {
        computerName = COMPUTER_NAME,
        status = {
            isActive = true,
            currentTask = "Mining diamonds",
            fuel = 500,
            position = {x = 155, y = 12, z = 225},
            inventory = {
                {slot = 1, item = "minecraft:diamond", count = 3},
                {slot = 2, item = "minecraft:cobblestone", count = 64},
                {slot = 3, item = "minecraft:coal", count = 32}
            },
            customData = {
                quarryProgress = "45%",
                oreCount = 15,
                timeRunning = "2h 30m"
            }
        }
    })
    ws.send(textutils.serializeJSON(statusMsg))
    print("Sent status update")
end

-- Main function
local function main()
    print("ComputerCraft Dashboard Test Script")
    print("Connecting to dashboard at: " .. DASHBOARD_URL)
    print("Computer ID: " .. COMPUTER_NAME)
    print("")
    
    -- Note: This is pseudo-code since ComputerCraft doesn't have built-in WebSocket support
    -- You'll need to use a WebSocket library or HTTP-based communication
    -- For actual implementation, you might use the HTTP API with long polling
    -- or set up a bridge server that converts HTTP requests to WebSocket messages
    
    print("To test this with your dashboard:")
    print("1. Set up a WebSocket server that bridges HTTP to WebSocket")
    print("2. Use the HTTP API to send messages to the bridge server")
    print("3. The bridge server forwards messages to your dashboard")
    print("")
    print("Example HTTP request format:")
    print('http.post("http://localhost:8080/send", textutils.serializeJSON(message))')
    
    -- Simulate what the messages would look like
    print("\n--- Simulated Messages ---")
    
    -- Create a fake WebSocket object for demonstration
    local fakeWS = {
        send = function(data)
            print("Would send: " .. data)
        end
    }
    
    sendAPIRegistration(fakeWS)
    print("")
    sendTestMessages(fakeWS)
end

-- Run the script
main()
