<?php
error_reporting(0);
/*--------------------------------------------------------------
	簡単お知らせビューア - sezinfo
	2006-04-16 Ver. 1.10
	(c)sapphirus.biz
	
	詳しい説明は下記のURLを参照して下さい。
	http://www.sapphirus.biz/php/sezinfo/

	このスクリプトのエンコードはEUC-JPです。
	TEXTAREAのみタグを利用できますが、一覧表示のときは
	テキストとして表示します。
	[url]http://～[/url]で囲うとAタグでその中を囲みます。
	「JavaScriptファイル」へ反映で、JavaScriptで利用するための
	ファイルに書き出します。
	
	※環境によっては$dataFile と $jsFile に
	パーミッションの設定(666)が必要になります。
================================================================
	Ex.) sezinfo.php
--------------------------------------------------------------*/
//設定

$pageTitle='更新履歴';	//このページのタイトル
$password='furukawa0'; //ログイン・書き出し確認用パスワード
$maxData='3';	//データの最大保存数(あまり大きくすると重くなります)
$encode='utf-8';	//表示用JavaScriptファイルのエンコード(SJIS/EUC-JP)
$dataFile='sample.dat';	//データ保存用ファイル(パーミッションは666に)
$jsFile='sample.js';	//表示用JavaScriptファイル(パーミッションは666に)
$dataDir='data';	//上記2つの格納ディレクトリ

mb_internal_encoding("UTF-8");
//ログインチェック
session_start();
if($_SESSION['login']==$password);
elseif($_POST['login']!=$password){
	echo <<<EOD
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
<title>{$pageTitle} - ログイン</title>
<style type="text/css">
<!--
div#LOGIN table {
	border: 1px solid #ccc;
	margin-top: 20px;
}
div#LOGIN td, div#LOGIN th {
	font-size: 12px;
	line-height: 150%;
	padding: 4px;
	border: 1px solid #fff;
	text-align: center;
}
div#LOGIN th {
	background: #eee;
}
-->
</style>
</head>
<body>
<div id="LOGIN">
    <form id="form1" name="form1" method="post" action="">
        <table align="center" cellpadding="0" cellspacing="0">
            <tr>
                <th colspan="2">パスワードを入力してください</th>
            </tr>
            <tr>
                <td><input name="login" type="password" id="login" /></td>
                <td><input type="submit" value="ログイン" /></td>
            </tr>
        </table>
    </form>
</div>
</body>
</html>
EOD;
	exit;
}

//メイン
$_SESSION['login']=$password;
if(!$_POST){
	$mode=$_GET['mode'];
	$id=$_GET['id'];
}else{
	extract($_POST);
}
$scriptName=$_SERVER['SCRIPT_NAME'];
$status="&nbsp;";
$data=@file("$dataDir/$dataFile")or $status='データがありません';
$id--;

switch($mode){
case'edit';	//編集データ取得
	list($title,$text,$date)=explode("\t",rtrim(htmlspecialchars($data[$id])));
	list($year,$month,$day)=explode("/",$date);
	$text=str_replace("[br /]","\n",$text);
	$id++;
	$status="No.$id を編集します";
	break;

case'write';	//データ書き込み
	if(!$title&&!$text){
		$status='<span id="Err">入力してください</span>';
	//}elseif(!$title||!$text){
	}elseif(!$title){
		$status='<span id="Err">入力されていない項目があります</span>';
	}elseif(!preg_match("/\d{4}/",$year)){
		$status='<span id="Err">更新日(年)が正しくありません</span>';
	}else{
		if(get_magic_quotes_gpc()){
			$title=stripslashes($title);
			$text=stripslashes($text);
		}
//		$title=htmlspecialchars($title);
		$text=preg_replace("/\n/","[br /]",$text);
		$text=preg_replace("/\r/","",$text);
		$formData="$title\t$text\t$year/$month/$day\n";
		if($id<0){
			array_unshift($data,$formData);
		}else{
			$data[$id]=$formData;
			$id=NULL;
		}
		DataOut($data);
		$status='ファイルに書き出しました';
		unset($title,$text,$year,$month,$day,$id);
	}
	if($id>-1) $id++;
	break;

case'delete';	//デリート処理
	$data[$id]=NULL;
	DataOut($data);
	$status='データを削除しました';
	$id=NULL;
	break;

case'up';	//データ移動(上)
	if($id>0){
		$temp=array_splice($data,$id-1,1,$data[$id]);
		$data[$id]=$temp[0];
		DataOut($data);
		$id2=$id+1;
		$status="No.$id2 と No.$id を入れ替えました";
		$id=NULL;
	}
	break;

case'down';	//データ移動(下)
	if(id<count($data)){
		$temp=array_splice($data,$id+1,1,$data[$id]);
		$data[$id]=$temp[0];
		DataOut($data);
		$id++;
		$id2=$id+1;
		$status="No.$id と No.$id2 を入れ替えました";
		$id=NULL;
	}
	break;

case'export';	//JavaScript用データへ書き出し
	if(!$setPass){
		$status='<span id="Err">パスワードを入力してください</span>';
		//}elseif($password!=$setPass){
		//$status='<span id="Err">パスワードが一致しません</span>';
	}else{
		$output="info = new Array();\n";
		foreach($data as $key=>$value){
			$value=addslashes(str_replace("[br /]","<br />",Tag($value)));
			list($title,$text,$date)=explode("\t",rtrim($value));
			$output.="info[$key] = new Array(\"$title\",\"$text\",\"$date\");\n";
		}
		$fp=fopen("$dataDir/$jsFile","w")or exit('データを書き出せません');
		flock($fp,LOCK_EX);
		fwrite($fp,mb_convert_encoding($output,$encode,'utf-8'));
		flock($fp,LOCK_UN);
		fclose($fp);
		$status="{$jsFile} に書き出しました";
		unset($title,$text,$year,$month,$day,$id);
	}
	if($id>-1) $id++;
	break;
}

function DataOut($data){
	global $dataDir,$dataFile,$maxData;
	$output=implode('',$data);
	$fp=@fopen("$dataDir/$dataFile","w")or exit('データを書き出せません');
	flock($fp,LOCK_EX);
	for($i=0;$i<$maxData;$i++){
		@fwrite($fp,$data[$i]);
	}
	flock($fp,LOCK_UN);
	fclose($fp);
	return;
}

function Tag($html){
	$html=preg_replace('/\[url\](.+?)\[\/url\]/i','<a href="\1">\1</a>',$html);
	return $html;
}

header("Expires: Thu, 01 Dec 1994 16:00:00 GMT");
header("Last-Modified: ".gmdate("D, d M Y H:i:s")." GMT");
header("Cache-Control: no-cache, must-revalidate");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");
//ここからHTML
?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
<meta name="robots" content="noindex,nofellow" />
<title><?=$pageTitle?></title>
<link href="sezinfo.css" rel="stylesheet" type="text/css" />
</head>
<body>
<div id="Layout">
    <div id="Input">
        <table cellpadding="0" cellspacing="0">
            <tr bgcolor="#F1F1F1">
                <td colspan="2"><h1><?=$pageTitle?> (最大<?=$maxData?>件まで)</h1></td>
            </tr>
            <form name="form" id="form" method="post" action="<?=$scriptName?>">
                <tr>
                    <td align="right" nowrap="nowrap"><strong>タイトル</strong></td>
                    <td><input name="title" type="text" id="title" style="width:550px " value="<?=$title?>" /></td>
                </tr>
                <tr>
                    <td align="right" nowrap="nowrap"><strong>コメント</strong></td>
                    <td><textarea name="text" id="text" style="width:550px; height:80px "><?=$text?>
</textarea></td>
                </tr>
                <tr>
                    <td align="right" nowrap="nowrap"><strong>更新日</strong></td>
                    <td><?php
if(!$year){
	$year=date('Y');
}
echo"<input name=\"year\" type=\"text\" value=\"$year\" id=\"year\" size=\"4\" maxlength=\"4\" />";
?>
                        年
                        <select name="month" id="month">
                                <?php
//月-表示
for($m=1;$m<=12;$m++){
	if($m==$month){
		echo"                            <option value=\"$m\" selected>$m</option>\n";
	}elseif($m==date('m')&&!$month){
		echo"                            <option value=\"$m\" selected>$m</option>\n";
	}else{
		echo"                            <option value=\"$m\">$m</option>\n";
	}
}
?>
                            </select>
                        月
                        <select name="day" id="day">
                            <?php
//日-表示
for($d=1;$d<=31;$d++){
	if($d==$day){
		echo"                            <option value=\"$d\" selected>$d</option>\n";
	}elseif($d==date("d")&&$day==''){
		echo"                            <option value=\"$d\" selected>$d</option>\n";
	}else{
		echo"                            <option value=\"$d\">$d</option>\n";
	}
}
?>
                        </select>
                        日</td>
                </tr>
                <tr>
                    <th>&nbsp;</th>
                    <th align="left"><input name="mode" type="hidden" id="mode" value="write" />
                            <input name="id" type="hidden" id="id" value="<?=$id?>" />
                            <input type="submit" style="width:100px " value="書き込み" />
                            <input type="button" onclick="location.href='<?=$scriptName?>';" style="width:100px " value="クリア/再読込" />
                        ※ブラウザのリロード「再読込」は使わないでください</th>
                        
                        　<Div Align="right"><a href="./../../index.html"><strong><input type="button" value="TOPへ戻る" style = "background-color:#1E006A;color:#FFFF00;width:100px;font-weight:bold"/></strong></a></Div>
                </tr>
            </form>
            <tr>
                <td colspan="2" bgcolor="#F1F1F1"><h2>
                    <?=$status?>
                    <noscript>
                        <span id="Err">JavaScriptを有効にして下さい</span>
                        </noscript>
                </h2></td>
            </tr>
            <form name="form" id="form" method="post" action="<?=$scriptName?>">
            
            <tr>
                <th colspan="2" align="right" bgcolor="#F1F1F1"><strong>パスワード確認</strong>
                        <input name="setPass" type="password" id="setPass" size="8" maxlength="8" value="furukawa01"/>
                        <input name="mode" type="hidden" id="mode" value="export" />
                        <input type="submit" value="JavaScriptファイルへ反映" style="width:195px " /></th>
                </tr>
            </form>
        </table>
    </div>
    <div id="Data">
        <table cellspacing="0" cellpadding="0">
            <tr>
                <td><div class="Line">
                        <table cellpadding="0" cellspacing="0">
<?php
//データ表示
if(!$data=@file("$dataDir/$dataFile")) echo'<p align="center">データがありません</p>';
else{
	foreach($data as $key=>$value){
		$key++;
//		$value=htmlspecialchars($value);
//		$value=str_replace("&lt;","<",$value);
//		$value=str_replace("&gt;",">",$value);
		list($title,$text,$date)=explode("\t",rtrim($value));
		$text=str_replace("[br /]","<br />",Tag($text));
?>
                            <tr align="left" onmouseover="this.style.background='#f1f1f1'" onmouseout="this.style.background='#ffffff'">
                                <td nowrap="nowrap">No.<?=$key?></td>
                                <td><strong><?=$title?></strong><br />
                                    <?=$text?></td>
                                <td align="right" nowrap="nowrap"><?=$date?></td>
                                <td align="right" nowrap="nowrap"><?php
if(count($data)>$key){
	echo"<a href=\"{$scriptName}?mode=down&id={$key}\">∨</a>";
}
if(1<$key){
	echo"<a href=\"{$scriptName}?mode=up&id={$key}\">∧</a>";
}
?> | <a href="<?=$scriptname?>?mode=edit&id=<?=$key?>">
                    編集</a> | <a href="<?=$scriptName?>?mode=delete&id=<?=$key?>">削除</a>
                    </td>
            </tr>
            <?php
	}
}
?>
        </table>
    </div>
    </td>
    </tr>
    <tr>
        <td align="center"><a href="sample.html">表示サンプル</a></td>
    </tr>
    </table>
</div>
<!-- 著作権表記は削除しないで下さい -->
<div id="Copyright"><a href="http://www.sapphirus.biz/">(c) Sapphirus.Biz</a></div>
</div>
</body>
</html>
