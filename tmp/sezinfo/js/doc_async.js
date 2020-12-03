/*
非同期でテキストファイルの読み込み
(c)Sapphirus.Biz

HTML内に対応する出力先idの付いたブロックタグを用意して下さい。
Ex.) <div id="text-doc">Loading...</div>
読み込みが必要な分だけ
loadDocFile('textfile.txt', 'text-doc');
を setOnload() 内に記述して下さい。
*/

// ファイルの読み込み
function setOnload() {
	var d = (new Date()).getTime();
	// loadDocFile（ファイル名, 出力先id）
	loadDocFile('data/sample.txt?' + d, 'as-info');
}
if (window.addEventListener) window.addEventListener('load', setOnload, false);
if (window.attachEvent) window.attachEvent('onload', setOnload);


// HTTP通信でドキュメントを取得して出力
var targetObj = new Array();
function createXMLHttpRequest(cbFunc) {
	var XMLhttpObject = null;
	try {
		XMLhttpObject = new XMLHttpRequest();
	} catch(e) {
		try {
			XMLhttpObject = new ActiveXObject("Msxml2.XMLHTTP");
		} catch(e) {
			try {
				XMLhttpObject = new ActiveXObject("Microsoft.XMLHTTP");
			} catch(e) {
				return null;
			}
		}
	}
	if (XMLhttpObject) XMLhttpObject.onreadystatechange = cbFunc;
	return XMLhttpObject;
}
function loadDocFile(fName, idName) {
	targetObj[idName] = createXMLHttpRequest(function() { 
		document.getElementById(idName).innerHTML = ((targetObj[idName].readyState == 4) && (targetObj[idName].status == 200)) ? targetObj[idName].responseText : '<p class="loading">Loading...</p>';
	});
	if (targetObj[idName]) {
		targetObj[idName].open("GET", fName, true);
		targetObj[idName].send(null);
	}
}
