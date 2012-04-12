<?php
/*
SETUP:
Create a PHP file config.php that defines a variable $WOLFRAM_APPID with your app id.
Create a folder cache and make it read- and write-able for this script.
*/
 
include 'config.php';

header('Access-Control-Allow-Origin: *');
header('Content-Type: text/xml');

//$ROOT = '/Users/Jan/Sites/alphamaps';

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
    //echo $url;
    /*$defaults = array( 
        CURLOPT_URL => $url, 
        CURLOPT_HEADER => 0, 
        CURLOPT_RETURNTRANSFER => TRUE, 
        CURLOPT_TIMEOUT => 30 
    ); */
    
    $ch = curl_init(); 
    //echo "INIT";
    //curl_setopt_array($ch, $defaults);
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_HEADER, 0);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, TRUE);
    curl_setopt($ch, CURLOPT_TIMEOUT, 60);
    //echo "SETOPT";
    if( ! $result = curl_exec($ch)) 
    { 
        trigger_error(curl_error($ch)); 
    }
    //echo "EXEC";
    //echo $result;
    curl_close($ch); 
    return $result; 
}

$input = $_GET['input'];
$assumption = $_GET['assumption'];
//echo $input;
$cache_file = "cache/" . urlencode($input . '.' . $assumption);
//echo $cache_file;

if (file_exists($cache_file)) {
    $existing = file_get_contents($cache_file);
    echo $existing;
} else {    
    // create a new cURL resource
    //$ch = curl_init();
    
    // set URL and other appropriate options
    $url = 'http://api.wolframalpha.com/v2/query';
    $params = array(
        appid => $WOLFRAM_APPID,
        input => $input,
        podstate => array(
            'Location:CityData__Show coordinates',
            'Location:NuclearReactorData__Show coordinates',
            'Location:MountainData__Show coordinates',
            'Location:WaterfallData__Show coordinates',
            'Location:DamData__Show coordinates',
            'Location:AirportData__Show coordinates'
        )
    );
    if ($assumption)
        $params['assumption'] = $assumption;
    /*curl_setopt($ch, CURLOPT_URL, "http://api.wolframalpha.com/v2/query?appid=$appid&input=$input$params");
    curl_setopt($ch, CURLOPT_HEADER, 0);
    
    // grab URL and pass it to the browser
    curl_exec($ch);
    
    // close cURL resource, and free up system resources
    curl_close($ch);*/
    
    $response = curl_get($url, $params);
    
    echo $response;
    
    if (startswith($response, '<?xml')) {
        // only store valid XML response (as opposed to HTML error messages)
        //file_put_contents($cache_file, $response);
        $f = fopen($cache_file, 'x');
        fwrite($f, $response);
        fclose($f);
    }
}

?>