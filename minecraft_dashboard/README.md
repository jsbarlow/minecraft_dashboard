# Minecraft Dashboard

## Description

The goal of this project is to create a dashboard to interact with the mod ComputerCraft. The intent is for a user to be able to connect to an instance of the game through this dashboard and control aspects of their computers and turtles from it. Computer networks and commands will be configured in-game, and will connect to the dashboard through a websocket. The majority of the Minecraft related code will be written and configured on the game's side. This dashboard needs to have the capability to connect to the game, send messages to the game, and eventually, to allow the user to customize their dashboard to display data sent from the game and create buttons to send commands to the game.

I want to send data back and forth as json objects. The intent would be to allow the in-game application to be able to send a json outlining api functions and for the program to allow a user to map these functions to custom ui.

The main display needs to be a basic chat that displays priority messages from the in-game computer.