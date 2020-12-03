(function(){
  "use strict";
  queue()
    .defer(d3.text, "./data/w.txt")
    .defer(d3.csv, "./data/l1.csv")
    .defer(d3.csv, "./data/l2.csv")
    .defer(d3.csv, "./data/l3.csv")
    .defer(d3.text, "./data/rate1.txt")
    .defer(d3.text, "./data/rate2.txt")
    .defer(d3.text, "./data/rate3.txt")
    .defer(d3.text, "./data/mode1attrdata.txt")
    .defer(d3.json, "./data/mode1attrlabel.json")
    .defer(d3.text, "./data/mode2attrdata.txt")
    .defer(d3.json, "./data/mode2attrlabel.json")
    .defer(d3.text, "./data/mode3attrdata.txt")
    .defer(d3.json, "./data/mode3attrlabel.json")
    .defer(d3.json, "./data/parameter.json")
    .defer(d3.text, "./data/dim.txt")
    .await(main);

  function main(error, dataFile, 
    labelFile1, labelFile2, labelFile3, 
    alphaDataFile1, alphaDataFile2, alphaDataFile3, 
    attrDataFile1, attrLabelFile1, 
    attrDataFile2, attrLabelFile2, 
    attrDataFile3, attrLabelFile3, 
    parameterFile, dimFile){
    var i,j,k,d,l; //巻き上げられるカウント用変数

    //
    // データ読み込み・パラメータの設定
    //

    // 参照テンソル読み込み(ひとまずD=1)
    var dataSet = dataFile.replace(/\n+$/g,'').split("\n\n\n");
    for(i=0; i<dataSet.length; i++){
      dataSet[i] = dataSet[i].split("\n\n");
      for(j=0; j<dataSet[i].length; j++){
        dataSet[i][j] = dataSet[i][j].split("\n");
        for(k=0; k<dataSet[i][j].length; k++){
          dataSet[i][j][k] = dataSet[i][j][k].split(" ");
          for(d=0; d<dataSet[i][j][k].length; d++){
            dataSet[i][j][k][d] = parseFloat(dataSet[i][j][k][d]);
          }
        }
      }
    }

    // 学習率読み込み
    var alpha = [alphaDataFile1,alphaDataFile2,alphaDataFile3];
    alpha.forEach(function(d,i){
      alpha[i] = d.replace(/\n+$/g,'').split("\n");
      alpha[i].forEach(function(x,j){
        alpha[i][j] = x.split(" ");
        alpha[i][j].forEach(function(y,k){
          alpha[i][j][k] = parseFloat(alpha[i][j][k]);
        });
      });
    });

    // 属性情報読み込み
    var attributeBinaryDataSets = [attrDataFile1, attrDataFile2, attrDataFile3];

    attributeBinaryDataSets.forEach(function(x,i){
      attributeBinaryDataSets[i] = x.replace(/\n+$/g,'').split("\n");
      attributeBinaryDataSets[i].forEach(function(y,j){
        attributeBinaryDataSets[i][j] = y.split(" ");
        attributeBinaryDataSets[i][j].forEach(function(z,k){
          attributeBinaryDataSets[i][j][k] = parseInt(attributeBinaryDataSets[i][j][k], 10);
        });
      });
    });


    // 属性情報ID作成
    var attrLabelFile = [attrLabelFile1, attrLabelFile2, attrLabelFile3];
    var attributeID = [{},{},{}];
    var attributeNum = [];
    var count = 0;
    var index = 0;
    attributeID.forEach(function(x,i){
      count = 0;
      index = 0;
      for(var key in attrLabelFile[i]){
        attributeID[i][index] = {};
        attrLabelFile[i][key].forEach(function(y,j){
          attributeID[i][index][j] = count;
          count += 1;
        });
        index += 1;
      }
      attributeNum[i] = index;
    });

    var focusedAttribute = [[],[],[]];
    focusedAttribute.forEach(function(x,i){
      for(j=0; j<Object.keys(attrLabelFile[i]).length; j++){
        focusedAttribute[i].push(-1);
      }
    });

    // ラベルデータ読み込み
    var label = [labelFile1, labelFile2, labelFile3];
    // ラベルの動的配置用
    var force = [d3.layout.force(), d3.layout.force(), d3.layout.force()];

    // 次元モードのラベル読み込み
    var labeldim = dimFile.replace(/\n+$/g,'').split("\n");
    var dimNum = labeldim.length;
    labeldim.unshift("全ての次元");
    var focusdim = -1; // -1:全ての次元を着目

    // 各モードの名前
    var modeName = [parameterFile.input.mode1_name,parameterFile.input.mode2_name,parameterFile.input.mode3_name];
    var modeNum = 3;


    // ユニットサイズ設定(※のちに読み込みで対処できるようにすること)
    var unitNumX = parameterFile.parameter.unit_num_x;
    var unitNumY = parameterFile.parameter.unit_num_y;
    var unitNum = unitNumX * unitNumY;
    var umatUnitNumX = unitNumX * 2 - 1;
    var umatUnitNumY = unitNumY * 2 - 1;
    var umatUnitNum = umatUnitNumX * umatUnitNumY;


    //
    // カラースケールの設定
    //

    // U-Matrix用カラースケール関数定義
    d3.interpolateHslLong = function(a,b){
      a = d3.hsl(a);
      b = d3.hsl(b);
      var h0 = a.h,
        s0 = a.s,
        l0 = a.l,
        h1 = b.h - h0,
        s1 = b.s - s0,
        l1 = b.l - l0;
      return function(t) {
        return d3.hsl(h0 + h1 * t, s0 + s1 * t, l0 + l1 * t).rgb().toString();
      };
    };

    // 各カラースケールを設定
    var vmin = parameterFile.input.min_value;
    var vmax = parameterFile.input.max_value;
    var vave = (vmin + vmax)/2;

    var uColorScale = d3.interpolateHslLong("blue", "red");
    var cpColorScale = d3.scale.linear().domain([vmin,vave,vmax]).range(["blue","white","red"]);
    var attrColorScale = d3.scale.linear().domain([0,0.05]).range(["white","black"]);


    // 初期化・不変な設定
    var visualizeID = ["um","cp"];
    var visualizeName = ["U-Matrix","Score"];

    var visualizeMode = [0,0,0]; //0:U-matrix 1:Component Plane(Absolute) 2: Component Plane(Relative)
    var focus = [{unit: 0, flag: false},
                 {unit: 0, flag: false},
                 {unit: 0, flag: false}];

    var uColorData = [[],[],[]];
    var muColorData = [[],[],[]];
    var muCalcFlag = [false,false,false];
    var attrColorData = [];
    var attrFlag = false;


    //
    // 表示用のパラメータの計算・設定
    //

    var dimWidth = 0;
    if(dimNum > 1){
      dimWidth = 200;
    }
    var controlHeight = 140;
    var scrollBarWidth = 48;

    // マップ表示領域を仮計算
    var mapWidth = (window.innerWidth - dimWidth - scrollBarWidth)/modeNum;
    var mapHeight = window.innerHeight - controlHeight;

    // 六角形の半径算出
    var hexRadius = d3.max([d3.min([mapWidth/((unitNumX-0.5)*Math.sqrt(3) + 4),
                            2*mapHeight/(3*(unitNumY-1) + 8)]),13.5]);
    var uhexRadius = hexRadius/2;

    // マップ表示領域再計算
    mapWidth = hexRadius*(Math.sqrt(3)*(unitNumX-0.5)+4);
    mapHeight = hexRadius*((unitNumY-1)*3/2+2+2);

    // ユニットの中心点計算・六角形描画用準備
    var hexbin = d3.hexbin().radius(hexRadius);
    var hexPoints = [];
    var points = [];
    for(i=0; i<unitNumY; i++){
      for(j=0; j<unitNumX; j++){
        hexPoints.push([hexRadius*j*1.75, hexRadius*i*1.5]);
        points.push({x: hexRadius * (j+(i%2)*0.5) * Math.sqrt(3), y: hexRadius*i*1.5, unit: i*unitNumX+j});
      }
    }
    var uhexbin = d3.hexbin().radius(uhexRadius);
    var uhexPoints = [];
    var upoints = [];
    for(i=0; i<umatUnitNumY; i++){
      for(j=0; j<umatUnitNumX; j++){
        uhexPoints.push([uhexRadius * (j + Math.abs((i+2)%4-2)/2)* Math.sqrt(3), uhexRadius * i * 1.5]);
        upoints.push({x: uhexRadius * (j + Math.abs((i+2)%4-2)/2) * Math.sqrt(3), y: uhexRadius * i * 1.5});
      }
    }

    // ラベルを描画する座標
    label.forEach(function(d,it){
      label[it].forEach(function(data,index){
        label[it][index].x = points[data.unit].x;
        label[it][index].y = points[data.unit].y;
      });
    });

    // Forceレイアウトのパラメータ設定
    force.forEach(function(d,it){
      if(it === 0){
        force[it] = d3.layout.force()
                              .nodes(label[it])
                              .charge(0)
                              .gravity(0)
                              .size([mapWidth-4*hexRadius, mapHeight-4*hexRadius]);
      }else{
        force[it] = d3.layout.force()
                              .nodes(label[it])
                              .charge(0)
                              .gravity(0)
                              // .charge(-hexRadius*1.0)
                              // .gravity(0.01)
                              .size([mapWidth-4*hexRadius, mapHeight-4*hexRadius]);
      }
    });


    //
    // DOM作成
    //

    // 一番大きい枠
    var chart = d3.select("#chart")
      .style("display", "flex")
      .style("flex-direction", "row");

    // モードごとの枠
    var modeChart = chart.selectAll("div")
      .data(modeName)
      .enter()
      .append("div")
      .attr("class", "modeChart bordered");



    // マップ表示の枠
    var mapChart = modeChart
      .append("div")
      .attr("id", function(d,i){
        return "map" + i;
      })
      .text(function(d){
        return d + "マップ";
      })
      .style("min-width", mapWidth+"px");
    mapChart.append("br");

    // マップの着目情報を表示
    var mapInfo = [];
    mapChart.each(function(d,i){
      mapInfo[i] = d3.select(this).append("div")
                      .style("width", mapWidth+"px")
                      .style("height", "60px")
                      .attr("class", "info bordered")
                      .text(function(data,it){
                        return d+"の類似度";
                      });
    });

    // マップのカラー変更用ラジオボタン
    visualizeID.forEach(function(data,it){
      mapChart.append("input")
                .attr("id", function(d,i){
                  return "mm" + i + data;
                })
                .attr("class", function(){
                  return data + "radio";
                })
                .attr("type", "radio")
                .attr("name", function(d,i){
                  return "radio" + i;
                })
                .property("checked", function(){
                  return it === 0; //U-Matrixにチェック
                })
                .datum("visualizeModeInput");
      mapChart.append("label")
                .attr("for", function(d,i){
                  return "mm" + i + data;
                })
                .text(function(){
                  return visualizeName[it];
                });
      mapChart.append("br");
    });

    // マップ本体
    var svg = mapChart.append("svg")
      .attr("width", mapWidth)
      .attr("height", mapHeight);

    // 描画領域
    var mapAll = svg.append("g")
                      .attr("transform", "translate(" +((1+Math.sqrt(3)/2)*hexRadius)+ "," + (2*hexRadius) + ")");
    var map = [];
    for(i=0; i<modeNum; i++){
      map.push(mapAll.filter(function(d,index){
        return index === i;
      }));
    }
    mapChart.append("br");

    // U-Matrix用六角形描画
    var uHexAll = mapAll.selectAll(".uHexagon")
                      .data(uhexbin(uhexPoints))
                      .enter()
                      .append("path")
                      .attr("class", "uHexagon")
                      .style("stroke", "black")
                      .style("stroke-width", 1.0)
                      .style("fill", function(d,i){
                        return uColorScale(i/umatUnitNum);
                      })
                      .attr("d", function(d){
                        return "M" + d.x + "," + d.y + uhexbin.hexagon();
                      });

    // ComponentPlane用六角形描画
    var cpHexAll = mapAll.selectAll(".cpHexagon")
                      .data(hexbin(hexPoints))
                      .enter()
                      .append("path")
                      .attr("class", "cpHexagon")
                      .style("opacity", 0.3)
                      .style("stroke", "black")
                      .style("stroke-width", 1.0)
                      .style("fill", function(d,i){
                        return cpColorScale(i/unitNum*5);
                      })
                      .attr("d", function(d){
                        return "M" + d.x + "," + d.y + hexbin.hexagon();
                      });

    // ユニットの中心点描画
    var dots = mapAll.selectAll(".dot")
                      .data(points)
                      .enter()
                      .append("circle")
                      .attr("class", "dot")
                      .attr("cx", function(d){
                        return d.x;
                      })
                      .attr("cy", function(d){
                        return d.y;
                      })
                      .attr("r", "1px")
                      .style("pointer-events", "none");

    // 勝者位置の点を大きく
    mapAll.each(function(d,i){
      var that = this;
      label[i].forEach(function(data){
        if(data.attr !== "input")
          return true;
        d3.select(that).selectAll(".dot")
          .filter(function(dot){
            return (dot.unit === Number(data.unit));
          })
          .attr("r", "4px");
      });
    });

    // ラベルの描画
    mapAll.each(function(data,i){
      d3.select(this).selectAll(".label")
                      .data(label[i])
                      .enter()
                      .append("text")
                      .attr("class", "label")
                      .attr("text-anchor", "middle")
                      .attr("x", function(d){
                        return d.x;
                      })
                      .attr("y", function(d){
                        return d.y;
                      })
                      .attr("font-family", "Meiryo UI")
                      .attr("font-weight", "bolder")
                      .attr("font-size", hexRadius*0.5)
                      .attr("fill", "#000")
                      .attr("stroke-width", 2)
                      .attr("stroke", "#FFF")
                      .attr("paint-order", "stroke")
                      .text(function(d){
                        return d.label;
                      })
                      .style("pointer-events", "none")
                      .style("display", function(d){
                        if(d.attr === "input"){
                          return "inline";
                        }else{
                          return "none";
                        }
                      });
    });

    // Forceレイアウトの挙動 
    force.forEach(function(d,it){
      d.on("tick", function(e){
      var k = 0.1 * e.alpha;
      label[it].forEach(function(o,j){
        o.y += (points[o.unit].y - o.y) * k;
        o.x += (points[o.unit].x - o.x) * k;
      });
      map[it].selectAll(".label")
            .attr("x", function(data){
              return data.x;
            })
            .attr("y", function(data){
              return data.y;
            });
      });
    });
    force.forEach(function(d){
      d.start();
    });

    // 六角形操作用変数準備
    var uHex = [];
    var cpHex = [];
    for(i=0; i<modeNum; i++){
      uHex.push(mapAll.filter(function(d,index){
        return index === i;
      }).selectAll(".uHexagon"));
      cpHex.push(mapAll.filter(function(d,index){
        return index === i;
      }).selectAll(".cpHexagon"));
    }

    var additionWidth = mapWidth/3;

    var additionChart = modeChart.append("div")
      .style("display", "flex")
      .style("flex-direction", "row");

    // 属性分布の枠
    var attrDistChart = additionChart.filter(function(d,i){return attributeNum[i] > 0;})
      .append("div")
      .attr("class", "addition")
      .style("width", additionWidth + "px")
      .text("属性の分布表示");
    attrDistChart.append("br");

    // 表示ラベルの枠
    var attrLabelChart = [];
    additionChart.each(function(d,i){
      attrLabelChart[i] = d3.select(this).append("div")
        .attr("class", "addition")
        .style("width", additionWidth + "px")
        .text("表示ラベル")
        .append("div")
        .attr("class", "bordered");
    });

    // 表示ラベルのボタンとその動作
    attrLabelChart.forEach(function(d,i){
      // ラベル非表示ボタン
      d.append("input")
        .attr("class", "attrlabel")
        .attr("id", "attrlabel" + i + "_no")
        .attr("type", "radio")
        .attr("name", "attrlabel" + i)
        .property("checked", false)
        .datum(-1);
      d.append("label")
        .attr("for", "attrlabel" + i + "_no")
        .text("ラベル非表示"); 
      d.append("br");
      // 入力データ表示ボタン
      d.append("input")
        .attr("class", "attrlabel")
        .attr("id", "attrlabel" + i + "_input")
        .attr("type", "radio")
        .attr("name", "attrlabel" + i)
        .property("checked", true)
        .datum("input");
      d.append("label")
        .attr("for", "attrlabel" + i + "_input")
        .text("入力データ"); 
      d.append("br");
      // 属性ピーク表示ボタン列挙
      Object.keys(attrLabelFile[i]).forEach(function(className){
        attrLabelFile[i][className].forEach(function(elementName){
          d.append("input")
            .attr("class", "attrlabel")
            .attr("id", "attrlabel" + i + "_" + className + "_" + elementName)
            .attr("type", "radio")
            .attr("name", "attrlabel" + i)
            .datum(className + "_" + elementName);
          d.append("label")
            .attr("for", "attrlabel" + i + "_" + className + "_" + elementName)
            .text(className + "_" + elementName);
          d.append("br");
        });
      });

      d.selectAll(".attrlabel").on("change", function(data, index){
        map[i].selectAll(".label")
        .transition()
          .attr("font-size", function(d){
            if(d.attr === data){
              return hexRadius*0.5;
            }else{
              return 0;
            }
          })
          .each("start", function(){
            d3.select(this)
              .style("display", function(d){
                if(d.attr === data){
                  return "inline";
                }else{
                  return "default";
                }
              })
              .attr("font-size", function(d){
                if(d.attr === data){
                  return 0;
                }else{
                  return "default";
                }
              });
          })
          .each("end", function(){
            d3.select(this)
              .style("display", function(d){
                if(d.attr === data){
                  return "default";
                }else{
                  return "none";
                }
              });
          });
        map[i].selectAll(".dot")
          .attr("r", "1px");
        label[i].forEach(function(ldata){
          if(ldata.attr !== data)
            return true;
          map[i].selectAll(".dot")
            .filter(function(dot){
              return (dot.unit === Number(ldata.unit));
            })
            .transition()
            .attr("r", function(d){
              return "4px";
            });
        });
        var f = {};
        f.i = focus[i].unit % unitNumX;
        f.j = Math.floor(focus[i].unit / unitNumX);
        changeImage(f,i);
      });
    });

    // 画像の枠
    var picChart = [];
    additionChart.each(function(d,i){
      picChart[i] = d3.select(this).append("div")
        .attr("class", "addition")
        .style("width", additionWidth + "px")
        .text("画像");
      picChart[i].selectAll(".pic")
        .data(function(){
          var result = [];
          label[i].forEach(function(data,index){
            if(data.imgType !== "none"){
              result.push(data);
            }
          });
          return result;
        })
        .enter()
        .append("img")
        .attr("class", "pic")
        .attr("width", additionWidth + "px")
        .style("display", "none");
    });

    var img = [];
    picChart.forEach(function(d,i){
      img[i] = [];
      d.selectAll(".pic").filter(function(data){
        return data.imgType !== "none";
      }).each(function(data, j){
          var that = d3.select(this);
          var text = UnescapeUTF8(EscapeSJIS(data.label));
          console.log(text);
          img[i][j] = new Image();
          img[i][j].src = "./data/" +  "img/" + (i+1) + "/" + text + "." + data.imgType;
          img[i][j].onload = function(){
            that.attr("src", img[i][j].src);
          };
          img[i][j].onerror = function(e){
            // csvに画像ありと書かれているが、ファイルが存在しない場合
            that.attr("src", "./data/img/noimage.png")
             .classed("noimage", true);
          };
        })
        .text(function(data){
          return data.label;
        });
    });

    // 属性情報の表
    var attributesBlocks = [[],[],[]];
    attributesBlocks.forEach(function(e,j){
      attributesBlocks[j] = attrDistChart.filter(function(d,i){return modeName[j] === d;})
                                          .selectAll(".attrblock")
                                          .data(function(d,i){
                                            return Object.keys(attrLabelFile[j]);
                                          })
                                          .enter()
                                          .append("div")
                                          .attr("class", "attrblock")
                                          .text(function(d){
                                            return d;
                                          });
      attributesBlocks[j].append("br");
    });

    var attributes = [[],[],[]];
    attributes.forEach(function(e,j){
      attributesBlocks[j].each(function(d,i){
        attributes[j][i] = d3.select(this).append("div")
                                        .style("float","left")
                                        .style("border","1px solid black")
                                        .style("padding-right","10px")
                                        .style("height","auto")
                                        .style("width", (additionWidth-20)+"px")
                                        .style("background","#DDF");
        attributes[j][i].append("input")
                      .attr("id", function(){
                        return j + "-" + d + "-1" + "指定なし";
                      })
                      .attr("class", "attrradio" + j)
                      .attr("type", "radio")
                      .attr("name", function(){
                        return "attrradio" + j + "-" + i;
                      })
                      .property("checked", true)
                      .datum(-1);
        attributes[j][i].append("label")
                      .attr("for", function(){
                        return j + "-" + d + "-1" + "指定なし";
                      })
                      .text(function(){
                        return d + "の指定なし";
                      });
        attributes[j][i].append("br");
        attrLabelFile[j][d].forEach(function(data, it){
          attributes[j][i].append("input")
                        .attr("id", function(){
                          return j + "-" + d + it + data;
                        })
                        .attr("class", "attrradio" + j)
                        .attr("type", "radio")
                        .attr("name", function(){
                          return "attrradio" + j + "-" + i;
                        })
                        .datum(data);
          attributes[j][i].append("label")
                        .attr("for", function(){
                          return j + "-" + d + it + data;
                        })
                        .text(function(){
                          return data;
                        });
          attributes[j][i].append("br");
        });
      });
      attributesBlocks[j].each(function(d,i){
        d3.select(this).selectAll(".attrradio"+j).on("change", function(data,it){
          // console.log("d: " + d + ", i: " + i + ", data: " + data + ", it: " + it);
  
          focusedAttribute[j][i] = it-1;
          // console.log(focusedAttribute);
  
          visualizeMode[j] = 1;
          changeVisualizeMode(j);
  
          calcAttrColor(j);
  
          //
          if(attrFlag){
            cpHex[j].style("fill", function(value,index){
              return attrColorScale(attrColorData[index]);
            });
            d3.select("#map"+j).selectAll("input")
              .property("checked", function(d){
                if(d === "visualizeModeInput"){
                  return false;
                }
              });
            visualizeMode[j] = -1;
  
            mapInfo[j].text(function(){
              var flags = [];
              for(var l=0; l<attributeBinaryDataSets[j].length; l++){
                flags[l] = true;
              }
              var info = "属性の分布(";
              for(var index=0; index < attributeNum[j]; index++){
                if(focusedAttribute[j][index] !== -1){
                  var attr = Object.keys(attrLabelFile[j])[index];
                  info += (attr + ":" + attrLabelFile[j][attr][focusedAttribute[j][index]] + " ");
                  for(l=0; l<attributeBinaryDataSets[j].length; l++){
                    if(flags[l] === true && attributeBinaryDataSets[j][l][attributeID[j][index][focusedAttribute[j][index]]] === 0){
                      flags[l] = false;
                    }
                  }
                }
              }
              var targetNumber = 0;
              flags.forEach(function(d){
                if(d === true){
                  targetNumber += 1;
                }
              });
              info += " 計" + targetNumber + "人)";
              return info;
            });
          }else{
            visualizeMode[j] = 1;
            changeVisualizeMode(j);
            d3.select("#map"+j).select(".cpradio")
              .property("checked", true);  
            // mapInfo[j].text(function(data){
            //   return data + "の評価値";
            // });
            changeInfo();
          }
        });
      });
    });

    // 属性情報の色表示
    function calcAttrColor(mapNum){
      var i,k;
      attrFlag = false;
      var flags = [];
      var I = attributeBinaryDataSets[mapNum].length;
      for(i=0; i<I; i++){
        flags[i] = true;
      }
      for(var index=0; index<attributeNum[mapNum]; index++){
        if(focusedAttribute[mapNum][index] !== -1){
          for(i=0; i<I; i++){
            if(flags[i] === true && attributeBinaryDataSets[mapNum][i][attributeID[mapNum][index][focusedAttribute[mapNum][index]]] === 0){
              flags[i] = false;
            }
          }
          attrFlag = true;
        }
      }

      var sum = 0.0;
      for(k=0; k<unitNum; k++){
        attrColorData[k] = 0.0;
        for(i=0; i<I; i++){
          if(flags[i]){
            attrColorData[k] += alpha[mapNum][i][k];
          }
        }
        sum += attrColorData[k];
      }
      for(k=0; k<unitNum; k++){
        attrColorData[k] /= sum;
        if(isNaN(attrColorData[k])){
          attrColorData[k] = 0;
        }
      }
    }

    var dimChart;
    var dimSelector;
    if(dimNum > 1){
      dimChart = chart.append("div")
        .attr("class", "bordered")
        .text("次元の指定");
      dimChart.append("br");
      dimSelector = dimChart.append("select")
        .attr("name","dim");
      dimSelector.selectAll("option")
        .data(labeldim)
        .enter()
        .append("option")
        .attr("value", function(d,i){
          return i-1; //All:-1 dim1: 0 dim2: 1 ...
        })
        .text(function(d){
          return d;
        });
      dimSelector.on("change",function(d){
        focusdim = parseInt(d3.select(this).property("value"));
        for(var m=0; m<modeNum; m++){
          changeVisualizeMode(m);
        }
        changeInfo();
      });
    }

    //
    // 初期化：全部U-Matrixを表示
    //

    for(i = 0; i < modeNum; i++){
      visualizeMode[i] = 0;
      changeVisualizeMode(i);
    }

    // イベント: 表示モード変更
    d3.selectAll(".umradio").on("change", function(d,i){
      visualizeMode[i] = 0;
      changeVisualizeMode(i);
      clearAttrCheck(i);
      changeInfo();
    });
    d3.selectAll(".cpradio").on("change", function(d,i){
      visualizeMode[i] = 1;
      changeVisualizeMode(i);
      clearAttrCheck(i);
      changeInfo();
    });
    d3.selectAll(".cprradio").on("change",function(d,i){
      visualizeMode[i] = 2;
      changeVisualizeMode(i);
      clearAttrCheck(i);
      changeInfo();
    });

    // 属性の指定を消去
    function clearAttrCheck(mapNum){
      for(var i=0; i<Object.keys(attrLabelFile[mapNum]).length; i++){
        focusedAttribute[mapNum][i] = -1;
        attributes[mapNum][i].select("input")
                      .property("checked", true);
      }
    }

    // 画面上部のテキストを更新
    function changeInfo(){
      for(var i=0; i<modeNum; i++){
        mapInfo[i].text(function(d){
          var l; //ループ変数
          var result = "";
          var others = [0,1,2].filter(function(data){
            return (data !== i);
          });
          var flag = false;
          others.forEach(function(data, it){
            if(focus[data].flag){
              if(flag){
                result += ",";
              }
              flag = true;
              result += "特定の" + modeName[data] + "(" + focus[data].unit + ")";
            }
          });
          if(flag){
            result += "についての";
          }

          result += d + "の";
          if(visualizeMode[i] === 0){
            if(focusdim !== -1){
              result += labeldim[focusdim+1] + "に関する類似度";
            }else{
              result += "類似度";
            }
          }else if(visualizeMode[i] === 1){
            // result += "評価値";
            //着目次元の情報追加
            if(focusdim !== -1){
              result += labeldim[focusdim+1] + "に関する評価値";
            }else{
              result += "全評価の平均値";
            }
          }else if(visualizeMode[i] === 2){
            // result += "評価値";
            //着目次元の情報追加
            if(focusdim !== -1){
              result += labeldim[focusdim+1] + "に関する評価値";
            }else{
              result += "全評価の平均値";
            }
          }



          //属性情報は全く別
          if(visualizeMode[i] === -1){
            var flags = [];
            for(l=0; l<attributeBinaryDataSets[i].length; l++){
              flags[l] = true;
            }
            result = "属性の分布(";
            for(var index=0; index < attributeNum[i]; index++){
              if(focusedAttribute[i][index] !== -1){
                var attr = Object.keys(attrLabelFile[i])[index];
                result += (attr + ":" + attrLabelFile[i][attr][focusedAttribute[i][index]] + " ");
                for(l=0; l<attributeBinaryDataSets[i].length; l++){
                  if(flags[l] === true && attributeBinaryDataSets[i][l][attributeID[i][index][focusedAttribute[i][index]]] === 0){
                    flags[l] = false;
                  }
                }
              }
            }
            var targetNumber = 0;
            flags.forEach(function(d){
              if(d === true){
                targetNumber += 1;
              }
            });
            result += " 計" + targetNumber + "人)";
          }
          return result;
        });
      }
    }

    // i番マップの表示モードを変更
    function changeVisualizeMode(i){
      if(visualizeMode[i] === 0){ //U-matrix
        cpHex[i].transition()
                .style("opacity", 0);
        drawUMatColor(i);
      }else if(visualizeMode[i] === 1){ //Component Plane
        cpHex[i].transition()
                .style("opacity", 1);
        drawCPColor(i);
      }else if(visualizeMode[i] === 2){
        cpHex[i].transition()
                .style("opacity", 1);
        drawCPColor(i);
      }
    }

    // イベント: フォーカス関連
    var clicking = false;
    var stay = false;
    d3.select("body").on("mouseup", function(){
      clicking = false;
    });
    chart.selectAll("div").on("mouseleave", function(){
      clicking = false;
    });
    d3.select("body").on("mousedown", function(){
      clicking = true;
      // d3.event.preventDefault();
    });
    svg.each(function(d,i){
      d3.select(this).selectAll(".cpHexagon").on("mouseover", function(data){
        if(clicking && focus[i].flag){
          changeMapFocus(data, i);
          changeMapColor(i);
          changeInfo();
          d3.event.preventDefault();
        }
      });
    });
    svg.each(function(d,i){
      d3.select(this).selectAll(".cpHexagon").on("mousedown", function(data){
        if(!focus[i].flag){
          // フォーカス作成
          stay = false;
          focus[i].flag = true;
          createMapFocus(data, i);
          changeInfo();
        }else if(focus[i].unit === (data.j*unitNumX + data.i)){
          stay = true;
        }else{
          // フォーカス移動
          stay = false;
          changeMapFocus(data, i);
          changeInfo();
        }
        changeMapColor(i);
        changeInfo();
        d3.event.preventDefault();
      });
      d3.select(this).selectAll(".cpHexagon").on("click", function(data){
        if(focus[i].flag && focus[i].unit === (data.j*unitNumX + data.i) && stay){
          // フォーカス削除
          stay = false;
          focus[i].flag = false;
          deleteMapFocus(i);
          changeMapColor(i);
          changeInfo();
          d3.event.preventDefault();
        }
      });
    });

    // フォーカスの円を作成
    function createMapFocus(d,i){
      map[i].selectAll(".focus").remove();
      map[i].append("circle")
            .attr("class", "focus")
            .attr("cx", d.x)
            .attr("cy", d.y)
            .style("fill", "none")
            .style("stroke", "green")
            .style("stroke-width", 3)
            .style("opacity", 0)
            .attr("r", hexRadius*3)
            .transition()
            .attr("r", hexRadius)
            .style("opacity", 1);
      focus[i].unit = d.j*unitNumX + d.i;

      changeImage(d, i);
    }

    // フォーカスの円を削除
    function deleteMapFocus(i){
      map[i].selectAll(".focus")
            .transition()
            .attr("r", hexRadius*3)
            .style("opacity", 0)
            .remove();

      changeImage(null,i);
    }

    // フォーカスの円を移動
    function changeMapFocus(d, i){
      map[i].select(".focus")
            .transition()
            .duration(30)
            .attr("cx", d.x)
            .attr("cy", d.y)
            .attr("r", hexRadius)
            .style("opacity", 1);
      focus[i].unit = d.j*unitNumX + d.i;

      changeImage(d,i);
    }

    function changeImage(d, i){
      picChart[i].selectAll(".pic").style("display", function(data,index){
        if(d === null){
          return "none";
        }
        if(!d3.select("input#attrlabel" + i + "_input").property("checked")){
          return "none";
        }
        if(!focus[i].flag){
          return "none";
        }
        var unit = d.j*unitNumX + d.i;
        if(data.imgType !== "none" && unit === Number(data.unit)){
          return "inline";
        }else{
          return "none";
        }
      });
    }

    // フォーカスの円の座標とサイズを修正（Windowのサイズ変更時に使用）
    function resizeMapFocus(){
      map.forEach(function(d,it){
        if(focus[it].flag){
          var i = focus[it].unit % unitNumX;
          var j = Math.floor(focus[it].unit / unitNumX);
          d.selectAll(".cpHexagon").filter(function(data){
            return (data.i === i && data.j === j);
          })
            .each(function(data){
              changeMapFocus(data, it);
            });
        }
      });
    }

    // i番"以外"のマップの色を変更
    function changeMapColor(i){
      for(var it = 0; it < modeNum; it++){
        if(i !== it){
          if(visualizeMode[it] === 0){
            drawUMatColor(it);
          }else if(visualizeMode[it] === 1){
            drawCPColor(it);
          }else if(visualizeMode[it] === 2){
            drawCPColor(it);
          }
        }
      }
    }

    // i番マップのU-Matrixを表示
    function drawUMatColor(i){
      calcUMatColor(i);
      uHex[i].style("fill", function(d,it){
        return uColorScale(uColorData[i][it]);
      });
    }

    // i番マップのU-Matrixを計算
    function calcUMatColor(mapNum){
      var others = [0,1,2].filter(function(d){
        return (d !== mapNum);
      });
      var flag1 = focus[others[0]].flag;
      var unit1 = focus[others[0]].unit;
      var flag2 = focus[others[1]].flag;
      var unit2 = focus[others[1]].unit;

      var d;
      var dis = [];
      var sum = 0.0;
      var sum2 = 0.0;
      var n2 = 0;
      var i,j,n,pos;

      // Marginal U-Matrixは再計算しない
      if(!flag1 && !flag2 && muCalcFlag[mapNum] && focusdim===-1){
        for(i=0; i<umatUnitNum; i++){
          uColorData[mapNum][i] = muColorData[mapNum][i];
        }
        return;
      }

      // MinorUnitの計算
      for(i=0; i<umatUnitNumX; i++){
        for(j=0; j<umatUnitNumY; j++){
          if(i%2 === 0 && j%2 === 0) continue;
          var k1, k2;
          if(j%4 === 3){
            k1 = Math.floor(j/2)*unitNumX + Math.floor(i/2);
            k2 = Math.ceil(j/2)*unitNumX + Math.ceil(i/2);
          }else{
            k1 = Math.ceil(j/2)*unitNumX + Math.floor(i/2);
            k2 = Math.floor(j/2)*unitNumX + Math.ceil(i/2);
          }
          d = dataDistance(mapNum,k1,k2);
          dis[j*umatUnitNumX + i] = d;
          sum += d;
          sum2 += d*d;
          n2 += 1;
        }
      }
      //major unit
      for(i=0; i<umatUnitNumX; i++){
        for(j=0; j<umatUnitNumY; j++){
          if(i%2 === 0 && j%2 === 0){
            count = 0;
            d = 0.0;
            for(n=0; n<6; n++){
              pos = neighborUnit(i,j,n);
              if(pos === -1) continue;
              d += dis[pos];
              count += 1;
            }
            d = d / count;
            dis[j*umatUnitNumX + i] = d;
            sum += d;
            sum2 += d*d;
            n2 += 1;
          }
        }
      }
      var mu = sum/n2;
      var sigma = Math.sqrt(sum2/n2 - Math.pow(mu,2));
      for(i=0; i<umatUnitNumX; i++){
        for(j=0; j<umatUnitNumY; j++){
          if(i%2 === 0 && j%2 === 0){
            uColorData[mapNum][j*umatUnitNumX + i] = dis[j*umatUnitNumX + i];
          }else{
            count = 0;
            d = 0.0;
            for(n=0; n<6; n++){
              pos = neighborUnit(i,j,n);
              if(pos === -1) continue;
              d += dis[pos];
              count += 1;
            }
            d = (d + dis[j*umatUnitNumX + i] )/(count + 1);
            uColorData[mapNum][j*umatUnitNumX + i] = d;
          }
        }
      }
      for(i=0; i<umatUnitNum; i++){
        uColorData[mapNum][i] = (uColorData[mapNum][i] - mu)/(sigma * 4) + 0.5;
        if(uColorData[mapNum][i] < 0){
          uColorData[mapNum][i] = 0;
        }
        if(uColorData[mapNum][i] > 1){
          uColorData[mapNum][i] = 1;
        }
      }
      if(!flag1 && !flag2 && !muCalcFlag[mapNum]){
        for(i=0; i<umatUnitNum; i++){
          muColorData[mapNum][i] = uColorData[mapNum][i];
        }
        muCalcFlag[mapNum] = true;
        // console.log("map" + hexi + ": first calc");
      }
    }

    // 他のマップの着目点をもとに、mapNum番モードのユニットk1,k2間距離を計算
    function dataDistance(mapNum, k1, k2)
    {
      var it, it1, it2, itd;
      var others = [0,1,2].filter(function(d){
        return (d !== mapNum);
      });
      var flag1 = focus[others[0]].flag;
      var unit1 = focus[others[0]].unit;
      var flag2 = focus[others[1]].flag;
      var unit2 = focus[others[1]].unit;

      var result = 0.0;
      if(flag1 && flag2){
        if(focusdim !== -1){
          result = Math.pow(getData(mapNum,k1,unit1,unit2,focusdim)-getData(mapNum,k2,unit1,unit2,focusdim),2);
        }else{
          for(itd=0; itd<dimNum; itd++){
            result += Math.pow(getData(mapNum,k1,unit1,unit2,itd)-getData(mapNum,k2,unit1,unit2,itd),2);
          }
        }
      }else if(flag1 && !flag2){
        if(focusdim !== -1){
          for(it=0; it<unitNum; it++){
            result += Math.pow(getData(mapNum,k1,unit1,it,focusdim)-getData(mapNum,k2,unit1,it,focusdim),2);
          }
        }else{
          for(it=0; it<unitNum; it++){
            for(itd=0; itd<dimNum; itd++){
              result += Math.pow(getData(mapNum,k1,unit1,it,itd)-getData(mapNum,k2,unit1,it,itd),2);
            }
          }
        }
      }else if(!flag1 && flag2){
        if(focusdim !== -1){
          for(it=0; it<unitNum; it++){
            result += Math.pow(getData(mapNum,k1,it,unit2,focusdim)-getData(mapNum,k2,it,unit2,focusdim),2);
          }
        }else{
          for(it=0; it<unitNum; it++){
            for(itd=0; itd<dimNum; itd++){
              result += Math.pow(getData(mapNum,k1,it,unit2,itd)-getData(mapNum,k2,it,unit2,itd),2);
            }
          }
        }
      }else if(!flag1 && !flag2){
        if(focusdim !== -1){
          for(it1=0; it1<unitNum; it1++){
            for(it2=0; it2<unitNum; it2++){
              result += Math.pow(getData(mapNum,k1,it1,it2,focusdim)-getData(mapNum,k2,it1,it2,focusdim),2);
            }
          }
        }else{
          for(it1=0; it1<unitNum; it1++){
            for(it2=0; it2<unitNum; it2++){
              for(itd=0; itd<dimNum; itd++){
                result += Math.pow(getData(mapNum,k1,it1,it2,itd)-getData(mapNum,k2,it1,it2,itd),2);
              }
            }
          }
        }
      }

      return Math.sqrt(result);
    }

    // (i,j)番ユニットの隣接ユニット番号を返す
    function neighborUnit(i,j,n){
      var x;
      var y;
      switch(n){
        case 0:
          x = i + ((j%4 === 1 || j%4 === 2)? 1:0);
          y = j-1;
          break;
        case 1:
          x = i+1;
          y = j;
          break;
        case 2:
          x = i + ((j%4 === 2 || j%4 === 3)? 1:0);
          y = j+1;
          break;
        case 3:
          x = i-1 + ((j%4 === 2 || j%4 === 3)? 1:0);
          y = j+1;
          break;
        case 4:
          x = i-1;
          y = j;
          break;
        case 5:
          x = i-1 + ((j%4 === 1 || j%4 === 2)? 1:0);
          y = j-1;
          break;
      }
      if(x < 0 || x >= umatUnitNumX || y < 0 || y >= umatUnitNumY){
        return -1;
      }
      return y*umatUnitNumX + x;
    }

    // i番マップのComponent Planeを計算して表示
    function drawCPColor(i){
      var others = [0,1,2].filter(function(d){
        return (d !== i);
      });
      var flag1 = focus[others[0]].flag;
      var unit1 = focus[others[0]].unit;
      var flag2 = focus[others[1]].flag;
      var unit2 = focus[others[1]].unit;

      // 絶対値表示モード
      if(visualizeMode[i] === 1){
        cpHex[i].style("fill", function(d,it){
          var data, it1, it2, itd;
          if(flag1 && flag2){
            if(focusdim !== -1){
              data = getData(i, it, unit1, unit2, focusdim);
            }else{
              data = 0;
              for(itd = 0; itd < dimNum; itd++){
                data += getData(i, it, unit1, unit2, itd);
              }
              data /= dimNum;
            }
          }else if(flag1 && !flag2){
            if(focusdim !== -1){
              data = 0;
              for(it1 = 0; it1 < unitNum; it1++){
                data += getData(i, it, unit1, it1, focusdim);
              }
              data /= unitNum;
            }else{
              data = 0;
              for(it1 = 0; it1 < unitNum; it1++){
                for(itd = 0; itd < dimNum; itd++){
                  data += getData(i, it, unit1, it1, itd);
                }
              }
              data /= (unitNum * dimNum);
            }

          }else if(!flag1 && flag2){
            data = 0;
            if(focusdim !== -1){
              for(it1 = 0; it1 < unitNum; it1++){
                data += getData(i, it, it1, unit2, focusdim);
              }
              data /= unitNum;
            }else{
              for(it1 = 0; it1 < unitNum; it1++){
                for(itd = 0; itd < dimNum; itd++){
                  data += getData(i, it, it1, unit2, itd);
                }
              }
              data /= (unitNum * dimNum);
            }
          }else if(!flag1 && !flag2){
            data = 0;
            if(focusdim !== -1){
              for(it1 = 0; it1 < unitNum; it1++){
                for(it2 = 0; it2 < unitNum; it2++){
                  data += getData(i, it, it1, it2, focusdim);
                }
              }
              data /= (unitNum * unitNum);
            }else{
              for(it1 = 0; it1 < unitNum; it1++){
                for(it2 = 0; it2 < unitNum; it2++){
                  for(itd = 0; itd < dimNum; itd++){
                    data += getData(i, it, it1, it2, itd);
                  }
                }
              }
              data /= (unitNum * unitNum * dimNum);
            }
          }
          return cpColorScale(data);
        });
      }
    }

    function getData(i, unit, other1, other2, dim){
      if(i === 0){
        return dataSet[unit][other1][other2][dim];
      }
      if(i === 1){
        return dataSet[other1][unit][other2][dim];
      }
      if(i === 2){
        return dataSet[other1][other2][unit][dim];
      }
    }

    // イベント： Windowのサイズ変更
    d3.select(window).on("resize", function(d){
      var i,j;
      //マップ表示領域
      mapWidth = (window.innerWidth - dimWidth - scrollBarWidth)/modeNum;
      mapHeight = window.innerHeight - controlHeight;

      //六角形の半径算出
      hexRadius = d3.max([d3.min([mapWidth/((unitNumX-0.5)*Math.sqrt(3) + 4),
                              2*mapHeight/(3*(unitNumY-1) + 8)]),13.5]);
      uhexRadius = hexRadius/2;

      //SVGサイズ再算出
      mapWidth = hexRadius*(Math.sqrt(3)*(unitNumX-0.5)+4);
      mapHeight = hexRadius*((unitNumY-1)*3/2+2+2);

      hexbin = d3.hexbin().radius(hexRadius);
      hexPoints = [];
      points = [];
      for(i=0; i<unitNumY; i++){
        for(j=0; j<unitNumX; j++){
          hexPoints.push([hexRadius*j*1.75, hexRadius*i*1.5]);
          points.push({x: hexRadius * (j+(i%2)*0.5) * Math.sqrt(3), y: hexRadius*i*1.5, unit: i*unitNumX+j});
        }
      }
      uhexbin = d3.hexbin().radius(uhexRadius);
      uhexPoints = [];
      upoints = [];
      for(i=0; i<umatUnitNumY; i++){
        for(j=0; j<umatUnitNumX; j++){
          uhexPoints.push([uhexRadius * (j + Math.abs((i+2)%4-2)/2)* Math.sqrt(3), uhexRadius * i * 1.5]);
          upoints.push({x: uhexRadius * (j + Math.abs((i+2)%4-2)/2) * Math.sqrt(3), y: uhexRadius * i * 1.5});
        }
      }

      mapChart.style("min-width", mapWidth+"px");
      mapAll.attr("transform", "translate(" +((1+Math.sqrt(3)/2)*hexRadius)+ "," + (2*hexRadius) + ")");

      svg.attr("width", mapWidth)
         .attr("height", mapHeight);

      cpHexAll.data(hexbin(hexPoints))
              .attr("d", function(d){
                return "M" + d.x + "," + d.y + hexbin.hexagon();
              });
      uHexAll.data(uhexbin(uhexPoints))
              .attr("d", function(d){
                return "M" + d.x + "," + d.y + uhexbin.hexagon();
              });
      dots.data(points)
            .attr("cx", function(d){
              return d.x;
            })
            .attr("cy", function(d){
              return d.y;
            });
      mapAll.each(function(data,i){
        d3.select(this).selectAll(".label")
                        .attr("x", function(d){
                          return points[d.unit].x;
                        })
                        .attr("y", function(d){
                          return points[d.unit].y + (hexRadius*0.6);
                        })
                        .attr("font-size", hexRadius*0.5);
      });
      label.forEach(function(d,it){
        label[it].forEach(function(data,index){
          label[it][index].x = points[data.unit].x;
          label[it][index].y = points[data.unit].y;
        });
      });
      force.forEach(function(d,it){
        d.on("tick", function(e){
        var k = 0.1 * e.alpha;
        label[it].forEach(function(o,j){
          o.y += (points[o.unit].y - o.y) * k;
          o.x += (points[o.unit].x - o.x) * k;
        });

        map[it].selectAll(".label")
              .attr("x", function(data){
                return data.x;
              })
              .attr("y", function(data){
                return data.y;
              });
        });
      });
      force.forEach(function(d){
        d.start();
      });
      resizeMapFocus();

      additionWidth = mapWidth/3;
      attributes.forEach(function(e,j){
        attributesBlocks[j].each(function(d,i){
          attributes[j][i].style("width", (additionWidth-20)+"px");
        });
      });
      additionChart.each(function(d,i){
        mapInfo[i].style("width", mapWidth + "px");
        d3.select(this).selectAll(".addition")
          .style("width", additionWidth + "px");
        picChart[i].style("width", additionWidth + "px")
          .selectAll(".pic").style("width", additionWidth + "px");
      });
    });
  }
})();