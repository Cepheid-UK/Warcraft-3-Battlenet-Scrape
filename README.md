# Warcraft-3-Battlenet-Scrape
A data scrape of the Warcraft 3 Battle.net website for a limited number of games.

These scripts scrape all the data from 1v1 games on the classic.battle.net website for the realms Northrend, Azeroth and Lordaeron, taking all the game score data, races, player names, colours, etc and formatting them into CSV files for processing.

# Notes #
This only collects data on games that are 1v1 or a 1v1 Tournament. It also only collects games that are 3 minutes or longer, and does not collect games over 90 minutes long.
There is no heuristic for removing lossbots or afk players in this script, the user will have to figure out how to remove low-value games themselves.

# Known Issues #
The "matchup" column was an experiment that I never got around to fixing, It works fine for players who selected their race, but players who choose random will show up as "undefined".
