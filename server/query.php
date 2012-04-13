<?php
/*
SETUP:
Create a PHP file config.php that defines a variable $WOLFRAM_APPID with your app id.
Change the Access-Control-Allow-Origin header value to your domain (* for no restriction).
Create a folder cache in the same directory as this file and make it read- and write-able for this script.

This PHP script should work with PHP >= 4.4 (maybe even below that).
*/
 
include 'config.php';

header('Access-Control-Allow-Origin: *');
header('Content-Type: text/xml');

function startsWith($haystack, $needle)
{
    $length = strlen($needle);
    return (substr($haystack, 0, $length) === $needle);
}

function build_query($data, $sep='&')
{
    // build query without [<index>] stuff
    $ret = array(); 
    foreach ((array)$data as $k => $v) { 
        if (is_array($v)) {
            foreach($v as $subk => $subv)
                array_push($ret, $k.'='.urlencode($subv));
        } else
            array_push($ret, $k.'='.urlencode($v));
    } 
    return implode($sep, $ret);
}

function curl_get($url, $get) 
{    
    $url = $url. (strpos($url, '?') === FALSE ? '?' : ''). build_query($get);
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_HEADER, 0);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, TRUE);
    curl_setopt($ch, CURLOPT_TIMEOUT, 60);
    if( ! $result = curl_exec($ch)) 
    { 
        trigger_error(curl_error($ch)); 
    }
    curl_close($ch); 
    return $result; 
}

$input = $_GET['input'];
$input = strtolower(trim($input));
$assumption = $_GET['assumption'];
$cache_file = "cache/" . urlencode($input . '.' . $assumption);

function do_query($query)
{
    global $WOLFRAM_APPID;
    global $assumption;

    $url = 'http://api.wolframalpha.com/v2/query';
    $params = array(
        appid => $WOLFRAM_APPID,
        input => $query,
        format => 'plaintext',
        podstate => array(
            'Location:CityData__Show coordinates',
            'Location:NuclearReactorData__Show coordinates',
            'Location:MountainData__Show coordinates',
            'Location:WaterfallData__Show coordinates',
            'Location:DamData__Show coordinates',
            'Location:AirportData__Show coordinates',
            'Location:HospitalData__Show coordinates'
        )
    );
    if ($assumption)
        $params['assumption'] = $assumption;
    
    $response = curl_get($url, $params);
    
    return $response;
}

if (file_exists($cache_file)) {
    $existing = file_get_contents($cache_file);
    echo $existing;
} else {
    $response = do_query($input);
    
    echo $response;
    
    if (startswith($response, '<?xml')) {
        // only store valid XML response (as opposed to HTML error messages)
        $f = fopen($cache_file, 'x');
        fwrite($f, $response);
        fclose($f);
    }
}

?>