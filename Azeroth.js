const request = require('request')
const cheerio = require('cheerio')
const o2csv = require('objects-to-csv')

// FIRST ID OF AZEROTH: 23235109
// LAST ID OF AZEROTH: 23249312

var gamesParsed = 0;
var gamesNotFound = 0;
var gamesNotSolo = 0;
var badGame = 0;
var timeOuts = 0;

var baseUrl = 'http://classic.battle.net/war3/ladder/w3xp-game-detail.aspx?Gateway=Azeroth&GameID='

id = 23235109
var url = baseUrl + id

getHttp()

async function getHttp() {

    if (id === 23249312) {
        printResults();
        return;
    }

    url = baseUrl + id

    await request({
        url: url,
        json: false
    }, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var $ = cheerio.load(body)
    
            var numberOfPlayers = $('.rankingRowLeft').length / 3;
    
            var pagetitle = $('title').html();
    
            if (pagetitle == 'Frozen Throne Game Detail') {
                //console.log('Game page found, parsing game ID: ' + id + ' / Gametype is: ' + $(".playerStatsDataLeft").eq(2).text())
            } else if (pagetitle == 'Warcraft III Ladder - Error') {
                console.log('No game with id: ' + id + ' found.')
                gamesNotFound++
                if (gamesNotFound > 10) {
                    console.log('10 games were not found, cancelling scrape.')
                    printResults()
                    return;
                }
            } else {
                console.log('unknown error, page title found to be: ' + pagetitle)
            }
    
            // If the game is a 1v1 game (either type: 'Solo' or 'Tournament') we can proceed
    
            if (numberOfPlayers == 2) { // if this is a "Solo" game
    
                // scrape the game length
                var gameLength = $(".playerStatsDataLeft").eq(3).text()
                
                // regex for any "digit"
                var r = /\d+/;
    
                // .match(/\d+/) returns an array where the first element is the number that was found
                // check if game is 3 minutes or longer, and therefore probably not a joinbug or a lossbot, also included a 90min limit
                if (gameLength.match(r)[0] >= 3 && gameLength.match(r)[0] <= 90) { 
    
                    // get player names
                    p1name = $(".rankingRowLeft").eq(0).text()
                    p2name = $(".rankingRowLeft").eq(3).text()
    
                    // get player races
                    matchup = formatRaces();
    
                    // flag win and lose
                    var p1win;
                    var p2win;
                    if ($(".rankingRowLeft").eq(2).text() == 'Win') {
                        // p1 wins
                        p1win = true;
                        p2win = false;
                    } else if ($(".rankingRowLeft").eq(5).text() == 'Win') {
                        // p2 wins
                        p2win = true;
                        p1win = false;
                    }
    
                    // save the game date
                    var date = regexDate($(".playerStatsDataLeft").eq(0).text())
    
                    // save the game time
                    var time = regexTime($(".playerStatsDataLeft").eq(0).text())
    
                    // save the game length
                    var length = gameLength.match(r)[0]
    
                    // save the map
                    var map = $(".playerStatsDataLeft").eq(1).text();
    
                    // get the player colours (needed for scores)
                    var colours = getColours();
    
                    // get overview score HTML references   
                    p1scoreClass = String('.gameDetail' + colours[0]);
                    p2scoreClass = String('.gameDetail' + colours[1]);
    
                    // get overview scores
                    var overviewScores  = getOverviewScores(p1scoreClass,p2scoreClass);
    
                    // get unit scores
                    var unitScores = getUnitScores(p1scoreClass,p2scoreClass)
    
                    // get heroes & hero scores
                    var heroes = getHeroes(p1scoreClass,p2scoreClass)
                    var heroScores = getHeroScores(p1scoreClass,p2scoreClass)
    
                    // get resource scores
                    var resourceScores = getResourceScores(p1scoreClass, p2scoreClass)
                
                    createScrapedData();
                    getHttp();
                    
                    // ------------------------------------------------------------------------------------------- //
    
                    // CONSOLE LOG TESTS

                    //console.log(scrapedData)
    
    
                    // ------------------------------------------------------------------------------------------- //
    
                    // FUNCTIONS
    
                    function createScrapedData() {
                        scrapedData = {};
    
                        scrapedData.gameID = id-1;
                        scrapedData.gameLength = length;
                        scrapedData.map = map;
                        scrapedData.matchup = Object.values(matchup[4]).toString().replace(/[.,\/",()]/g,"");
                        scrapedData.winningPlayer = getWinner();
                        scrapedData.date = date;
                        scrapedData.time = time;
                        scrapedData.gameType = $(".playerStatsDataLeft").eq(2).text(); // should only return 'Solo' or 'Tournament'
    
                        // PLAYER 1
    
                        scrapedData.p1name = p1name;
                        scrapedData.p1colour = colours[0];
                        scrapedData.p1race = $(".rankingRowLeft").eq(1).text()
                        scrapedData.p1numberOfHeroes = countHeroes(heroes[0])
    
                        // P1 Overview Scores
                        scrapedData.p1overviewUnitScore = getValue(Object.values(overviewScores[0][0]))
                        scrapedData.p1overviewHeroScore = getValue(Object.values(overviewScores[0][1]))
                        scrapedData.p1overviewResourceScore = getValue(Object.values(overviewScores[0][2]))
                        scrapedData.p1overviewTotalScore = getValue(Object.values(overviewScores[0][3]))
                        
                        // P1 Unit scores
                        scrapedData.p1unitsProduced = getValue(Object.values(unitScores[0][0]))
                        scrapedData.p1unitsKilled = getValue(Object.values(unitScores[0][1]))
                        scrapedData.p1buildingsProduced = getValue(Object.values(unitScores[0][2]))
                        scrapedData.p1buildingsRazed = getValue(Object.values(unitScores[0][3]))
                        scrapedData.p1largestArmy = getValue(Object.values(unitScores[0][4]))
    
                        // P1 Heroes
    
                        setP1HeroesToNull(scrapedData)
    
                        // checks how many heroes were scraped, then loops that many times to add the hero data
                        for (i=0;i<scrapedData.p1numberOfHeroes;i++) {
                            if (i=1) {
                                scrapedData.p1FirstHeroName = heroes[0][0]
                                scrapedData.p1FirstHeroLevel = heroes[0][1]
                            } if (i=2) {
                                scrapedData.p1SecondHeroName = heroes[0][2]
                                scrapedData.p1SecondHeroLevel = heroes[0][3]
                            } if (i=3) {
                                scrapedData.p1ThirdHeroName = heroes[0][4]
                                scrapedData.p1ThirdHeroLevel = heroes[0][5]
                            }
                        }
    
                        // P1 Hero Scores
    
                        scrapedData.p1heroesKilled = getValue(Object.values(heroScores[0][0]))
                        scrapedData.p1itemsObtained = getValue(Object.values(heroScores[0][1]))
                        scrapedData.p1mercenariesHired = getValue(Object.values(heroScores[0][2]))
                        scrapedData.p1experienceGained = getValue(Object.values(heroScores[0][3]))
    
                        // P1 Resource scores
    
                        scrapedData.p1goldMined = getValue(Object.values(resourceScores[0][0]))
                        scrapedData.p1lumberHarvested = getValue(Object.values(resourceScores[0][1]))
                        scrapedData.p1resourcesTraded = getValue(Object.values(resourceScores[0][2]))
                        scrapedData.p1techPercentage = getValue(Object.values(resourceScores[0][3].replace(/\ /,"")))
                        scrapedData.p1goldLostToUpkeep = getValue(Object.values(resourceScores[0][4]))
    
                        // PLAYER 2
    
                        scrapedData.p2name = p2name;
                        scrapedData.p2colour = colours[1];
                        scrapedData.p2race = $(".rankingRowLeft").eq(4).text()
                        scrapedData.p2numberOfHeroes = countHeroes(heroes[1])
    
                        // P2 Overview scores
                        scrapedData.p2overviewUnitScore = getValue(Object.values(overviewScores[1][0]))
                        scrapedData.p2overviewHeroScore = getValue(Object.values(overviewScores[1][1]))
                        scrapedData.p2overviewResourceScore = getValue(Object.values(overviewScores[1][2]))
                        scrapedData.p2overviewTotalScore = getValue(Object.values(overviewScores[1][3]))
    
                        // P2 Unit scores
                        scrapedData.p2unitsProduced = getValue(Object.values(unitScores[1][0]))
                        scrapedData.p2unitsKilled = getValue(Object.values(unitScores[1][1]))
                        scrapedData.p2buildingsProduced = getValue(Object.values(unitScores[1][2]))
                        scrapedData.p2buildingsRazed = getValue(Object.values(unitScores[1][3]))
                        scrapedData.p2largestArmy = getValue(Object.values(unitScores[1][4]))
                        
                        // P2 Heroes
    
                        setP2HeroesToNull(scrapedData)
    
                        for (i=0;i<scrapedData.p2numberOfHeroes;i++) {
                            if (i=1) {
                                scrapedData.p2FirstHeroName = heroes[1][0]
                                scrapedData.p2FirstHeroLevel = heroes[1][1]
                            } if (i=2) {
                                scrapedData.p2SecondHeroName = heroes[1][2]
                                scrapedData.p2SecondHeroLevel = heroes[1][3]
                            } if (i=3) {
                                scrapedData.p2ThirdHeroName = heroes[1][4]
                                scrapedData.p2ThirdHeroLevel = heroes[1][5]
                            }
                        }
    
                        // P2 Hero Scores
                        
                        scrapedData.p2heroesKilled = getValue(Object.values(heroScores[0][0]))
                        scrapedData.p2itemsObtained = getValue(Object.values(heroScores[0][1]))
                        scrapedData.p2mercenariesHired = getValue(Object.values(heroScores[0][2]))
                        scrapedData.p2experienceGained = getValue(Object.values(heroScores[0][3]))
    
                        // P2 Resource scores
    
                        scrapedData.p2goldMined = getValue(Object.values(resourceScores[1][0]))
                        scrapedData.p2lumberHarvested = getValue(Object.values(resourceScores[1][1]))
                        scrapedData.p2resourcesTraded = getValue(Object.values(resourceScores[1][2]))
                        scrapedData.p2techPercentage = getValue(Object.values(resourceScores[1][3].replace(/\ /,"")))
                        scrapedData.p2goldLostToUpkeep = getValue(Object.values(resourceScores[1][4]))
    
                        outputData = [scrapedData];
                        const csvOutput = new o2csv(outputData);
                        csvOutput.toDisk('./azeroth.csv', {append: true});
                        gamesParsed++
                        console.log('GameID: ' + id + ' - Successfully parsed and saved, ' + gamesParsed + ' games scraped so far')
                    }
                    
                    function setP1HeroesToNull(d) {
                        d.p1FirstHeroName = null
                        d.p1FirstHeroLevel  = null
                        d.p1SecondHeroName = null
                        d.p1SecondHeroLevel = null
                        d.p1ThirdHeroName = null
                        d.p1ThirdHeroLevel = null
                    }
                    
                    function setP2HeroesToNull(d) {
                        d.p2FirstHeroName = null
                        d.p2FirstHeroLevel  = null
                        d.p2SecondHeroName = null
                        d.p2SecondHeroLevel = null
                        d.p2ThirdHeroName = null
                        d.p2ThirdHeroLevel = null
                    }
                    
                    function countHeroes(heroesArray) {
                        return Object.keys(heroesArray).length / 2;
                    }
    
                    // removes , and " from strings that are like: '"35,010"' which is how the scores are brought in from cheerio
                    function getValue(units) {
                        var tempString = units.toString().replace(/[.,\/",()]/g,"");
                        return tempString;
                    }
    
                    // players are either player '1' or player '2' in solos
                    function getWinner() {
                        if (p1win) {return 1}
                        else {return 2}
                    }
    
                    function getHeroes(p1scoreClass,p2scoreClass) {
                        var r = /alt="(.*)" |&#xA0;(\d)/g
                        p1heroes = []
                        p2heroes = []
    
                        var i = 1;
                        var j = 1;
    
                        while (regexMatch = r.exec($(p1scoreClass).eq(2).html())) {
                            if (i%2 == 1) {
                                p1heroes.push(regexMatch[1])
                            } else {
                                p1heroes.push(regexMatch[2])
                            }
                            i++
                        }
                        
                        while (regexMatch = r.exec($(p2scoreClass).eq(2).html())) {
                            if (j%2 == 1) {
                                p2heroes.push(regexMatch[1])
                            } else {
                                p2heroes.push(regexMatch[2])
                            }
                            j++
                        }
                        return [p1heroes,p2heroes]
                    }
    
                    function getUnitScores(p1scoreClass,p2scoreClass) {
                        var unitScores = []
                        var p1 = []
                        var p2 = []
    
                        for (i=0;i<5;i++) {
                            p1[i] = $(p1scoreClass).eq(1).children().eq(i+1).text();
                            p2[i] = $(p2scoreClass).eq(1).children().eq(i+1).text();
                        }
    
                        unitScores = [p1,p2]
                        return unitScores
                    }
    
                    function getHeroScores(p1scoreClass,p2scoreClass) {
                        var heroScores = []
                        var p1 = []
                        var p2 = []
    
                        for (i=0;i<4;i++) {
                            p1[i] = $(p1scoreClass).eq(2).children().eq(i+2).text();
                            p2[i] = $(p2scoreClass).eq(2).children().eq(i+2).text();
                        }
    
                        heroScores = [p1,p2]
                        return heroScores
                    }
    
                    function getResourceScores(p1scoreClass,p2scoreClass) {
                        var resourceScores = []
                        var p1 = []
                        var p2 = []
    
                        for (i=0;i<5;i++) {
                            p1[i] = $(p1scoreClass).eq(3).children().eq(i+1).text();
                            p2[i] = $(p2scoreClass).eq(3).children().eq(i+1).text();
                        }
    
                        resourceScores = [p1,p2]
                        return resourceScores
                    }
    
                    function getOverviewScores(p1scoreClass,p2scoreClass) {
                        var player1Scores = []
                        var player2Scores = []
    
                        player1Scores[0] = $(p1scoreClass).children().eq(1).text();
                        player1Scores[1] = $(p1scoreClass).children().eq(2).text();
                        player1Scores[2] = $(p1scoreClass).children().eq(3).text();
                        player1Scores[3] = $(p1scoreClass).children().eq(4).text();
    
                        player2Scores[0] = $(p2scoreClass).children().eq(1).text();
                        player2Scores[1] = $(p2scoreClass).children().eq(2).text();
                        player2Scores[2] = $(p2scoreClass).children().eq(3).text();
                        player2Scores[3] = $(p2scoreClass).children().eq(4).text();
    
                        return [player1Scores,player2Scores]
                    }
    
                    function regexDate(string) {
                        var date_regex = /\d{1,2}\/\d{1,2}\/\d{4}/;
                        var a = string.match(date_regex);
                        return a[0]
                        
                    }
    
                    function regexTime(string) {
                        var time_regex = /\d{1,2}\:\d{1,2}\:\d{1,2}\ [A-Z]{2}/;
                        var a = string.match(time_regex);
                        return a[0]
                    }
    
                    function formatRaces() {
                        var r1;
                        var r2;
                        var p1rand = false;
                        var p2rand = false;
    
                        switch ($(".rankingRowLeft").eq(1).text()) {
                            case 'Orc':
                            r1 = 'O'
                            break;
                            case 'Human':
                            r1 = 'H'
                            break;
                            case 'Night Elf':
                            r1 = 'N'
                            break;
                            case 'Undead':
                            r1 = 'U'
                            break;
                            case 'Random (Orc)':
                            r1 = 'O'
                            p1rand = true;
                            break;
                            case 'Random (Human)':
                            r1 = 'H'
                            p1rand = true;
                            break;
                            case 'Random (Night Elf)':
                            r1 = 'N'
                            p1rand = true;
                            break;
                            case 'Random (Undead)':
                            r1 = 'U'
                            p1rand = true;
                            break;
                        }
    
                        switch ($(".rankingRowLeft").eq(4).text()) {
                            case 'Orc':
                            r2 = 'O'
                            break;
                            case 'Human':
                            r2 = 'H'
                            break;
                            case 'Night Elf':
                            r2 = 'N'
                            break;
                            case 'Undead':
                            r2 = 'U'
                            break;
                            case 'Random (Orc)':
                            r2 = 'O'
                            p2rand = true;
                            break;
                            case 'Random (Human)':
                            r2 = 'H'
                            p2rand = true;
                            break;
                            case 'Random (Night Elf)':
                            r2 = 'N'
                            p2rand = true;
                            break;
                            case 'Random (Undead)':
                            r2 = 'U'
                            p2rand = true;
                            break;
                        }
    
                        return [r1, p1rand, r2 , p2rand, String(r1 + 'v' + r2)]
    
                    }
                    
                        function getColours() {
    
                            var r = /[^.]*/;
                            p1colour = $('td[class=rankingRow]').html().slice(44).match(r)[0];
                            p2colour = $('td[class=rankingRow]').parent().next().children().html().slice(44).match(r)[0];
    
                            return [p1colour,p2colour]
                            
                            
                        }
                    
                } else {
                    badGame++
                    console.log('GameID: ' + id + ' - Game was found, but it is either <3 minutes, or >90 minutes / ' + badGame + ' number of games found in that category')
                    getHttp()
                }
            } else {
                gamesNotSolo++
                console.log('GameID: ' + id + ' - Game was found, but it is not a 1v1 game, game is type: ' + $(".playerStatsDataLeft").eq(2).text() + " / " + gamesNotSolo + " non-solo games found so far")
                getHttp();
            }
        } else {
            timeOuts++
            console.log('GameID: ' + id + ' - Request did not complete, error: ' + error + ' / Number of timeouts: ' + timeOuts)
            printResults()
        }
    }
    )
    id++    
}

function printResults() {
    console.log('Scraping Complete!\n' + gamesParsed + ' games parsed and saved.\n' + gamesNotFound + ' games not found\n' + gamesNotSolo + ' non-1v1 games found\n' + badGame + ' games found that were <3 or >90 mins (not counted)\n' + timeOuts + ' timeouts\n');
}
