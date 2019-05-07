$regex = '<td class=\"playerStatsDataLeft\".+<\/td>';
            $header = array();
            preg_match_all("/$regex/siU", $result, $header);
            //print_r($header);
            $game = new BnetGame;
            $game->id = $id;
            $game->timestamp = strtotime(substr(strip_tags($header[0][0]),0,-4));
            $game->timestamp = Carbon::createFromTimeStamp($game->timestamp);
            $game->map = strip_tags($header[0][1]);
            $game->game_type = strip_tags($header[0][2]);
            $game->duration = str_replace(array(' minutes',' minute'),'',strip_tags($header[0][3]));            
            $regex = '<td class=\"rankingRowLeft\".+<\/td>';
            $rankingRowLeft = array();
            preg_match_all("/$regex/siU", $result, $rankingRowLeft);

            $players = array();
            foreach($rankingRowLeft[0] as $num=>$td){
                $position = ceil(($num+1)/3);
                if($num%3==0){
                    $players[$position]["name"] = strip_tags($td);
                } else if ($num%3==1) {
                    $players[$position]["race"] = trim(str_replace(['Random  (',')'],'',strip_tags($td)));
                    $players[$position]["random_flag"] = strpos(strip_tags($td),'Random')===false?0:1;
                } else if ($num%3==2) {
                    $players[$position]["result"] = strip_tags($td)=="Win"?1:0;
                }
            }

            $regex = '<td class=\"rankingRow\".+<\/td>';
            $rankingRow = array();
            preg_match_all("/$regex/siU", $result, $rankingRow);

            foreach($rankingRow[0] as $num=>$td){
                $position = ceil(($num+1)/4);
                if($num%4==1){
                    $players[$position]["level"] = strip_tags($td);
                } else if ($num%4==2) {
                    $players[$position]["xp"] = str_replace(',','',strip_tags($td));
                } else if ($num%4==3) {
                    $players[$position]["xp_delta"] = str_replace(',','',strip_tags($td));
                }
            }

            foreach($players as $player){

                $bnet_player = new BnetGamePlayer;
                $bnet_player->bnet_game_id = $id;
                $bnet_player->name = $player['name'];
                $bnet_player->race = $player['race'];
                $bnet_player->random_flag = $player['random_flag'];
                $bnet_player->win = $player['result'];
                $bnet_player->lvl = $player['level'];
                $bnet_player->xp = $player['xp'];
                $bnet_player->xp_delta = $player['xp_delta'];

                $regex = preg_quote($player['name'])."<\/td>(.*)<\/tr>.*<tr>";
                $gameDetail = array();
                preg_match_all("/$regex/siU", $result, $gameDetail);

                $td_counter = $counter = 0;

                foreach($gameDetail[0] as $num=>$tr){

                    $regex = '<td.*>(.*)<\/td>';
                    $tds = array();
                    preg_match_all("/$regex/siU", $tr, $tds);

                    $hero_counter = 1;
                    foreach($tds[0] as $sub=>$td){
                        switch ($td_counter) {
                            case '0':
                                $bnet_player->unit_score = str_replace(',','',strip_tags($td));
                                $td_counter++;
                                break;
                            case '1':
                                $bnet_player->heroes_score = str_replace(',','',strip_tags($td));
                                $td_counter++;
                                break;
                            case '2':
                                $bnet_player->resource_score = str_replace(',','',strip_tags($td));
                                $td_counter++;
                                break;
                            case '3':
                                $bnet_player->total_score = str_replace(',','',strip_tags($td));
                                $td_counter++;
                                break;
                            case '4':
                                $bnet_player->units_produced = str_replace(',','',strip_tags($td));
                                $td_counter++;
                                break;
                            case '5':
                                $bnet_player->units_killed = str_replace(',','',strip_tags($td));
                                $td_counter++;
                                break;
                            case '6':
                                $bnet_player->buildings_produced = str_replace(',','',strip_tags($td));
                                $td_counter++;
                                break;
                            case '7':
                                $bnet_player->buildings_razed = str_replace(',','',strip_tags($td));
                                $td_counter++;
                                break;
                            case '8':
                                $bnet_player->largest_army = str_replace(',','',strip_tags($td));
                                $td_counter++;
                                break;
                            default:
                                switch ($counter) {
                                    case '0':
                                        if(!strpos($td,'alt')===false){
                                            $regex = "alt = \"(.+)\"";
                                            $hero = array();
                                            preg_match_all("/$regex/siU", $td, $hero);
                                            switch ($hero_counter) {
                                                case '1':
                                                    $bnet_player->hero_1 = $hero[1][0];
                                                    break;
                                                case '2':
                                                    $bnet_player->hero_2 = $hero[1][0];
                                                    break;
                                                case '3':
                                                    $bnet_player->hero_3 = $hero[1][0];
                                                    break;
                                                default:
                                                    //optional error handling
                                                    break;
                                            }
                                        } else if (!strpos($td,'gameDetailData')===false){
                                            $regex = "&nbsp;([0-9]+)&nbsp;";
                                            $herolevel = array();
                                            preg_match_all("/$regex/siU", $td, $herolevel);
                                            switch ($hero_counter) {
                                                case '1':
                                                    $bnet_player->hero_1_lvl = $herolevel[1][0];
                                                    break;
                                                case '2':
                                                    $bnet_player->hero_2_lvl = $herolevel[1][0];
                                                    break;
                                                case '3':
                                                    $bnet_player->hero_3_lvl = $herolevel[1][0];
                                                    break;
                                                default:
                                                    //optional error handling
                                                    break;
                                            }
                                            $hero_counter++;
                                        } else if (strpos($td,'<table')===false) {
                                            $bnet_player->heroes_killed = str_replace(',','',strip_tags($td));
                                            $counter=4;
                                        } else {
                                            continue;
                                        }
                                        break;
                                    case '4':
                                        $bnet_player->items_obtained = str_replace(',','',strip_tags($td));
                                        $counter++;
                                        break;
                                    case '5':
                                        $bnet_player->mercenaries_hired = str_replace(',','',strip_tags($td));
                                        $counter++;
                                        break;
                                    case '6':
                                        $bnet_player->experience_gained = str_replace(',','',strip_tags($td));
                                        $counter++;
                                        break;
                                    case '7':
                                        $bnet_player->gold_mined = str_replace(',','',strip_tags($td));
                                        $counter++;
                                        break;
                                    case '8':
                                        $bnet_player->lumber_harvested = str_replace(',','',strip_tags($td));
                                        $counter++;
                                        break;
                                    case '9':
                                        $bnet_player->resources_traded = str_replace(',','',strip_tags($td));
                                        $counter++;
                                        break;
                                    case '10':
                                        $bnet_player->tech_percentage = str_replace(' %','',strip_tags($td));
                                        $counter++;
                                        break;
                                    case '11':
                                        $bnet_player->upkeep = str_replace(',','',strip_tags($td));
                                        $counter++;
                                        break;
                                    default:
                                        //optional error handling
                                        break;
                                }
                                break;
                        }
                        
                    }

                }
