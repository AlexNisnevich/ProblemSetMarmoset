<?php

$formula = urldecode($_REQUEST['input']);
$engine = $_REQUEST['engine'];

switch ($engine) {
	case 'quicklatex':
		echo render_quicklatex($formula);
		break;
	case 'mathtran':
		echo render_mathtran($formula);
		break;
	default:
		echo 'Error: unknown engine';
		break;
}

function render_quicklatex($formula) {
	$formula = str_replace('\\\\', '\\', $formula);
	$formula = str_replace('&', '%26', $formula);
	$formula = str_replace('[comment]', '%25', $formula);
	
	$paramsArray = array(
		'formula' => $formula,
		'fsize' => '17px',
		'fcolor' => '000000',
		'mode' => 0,
		'out' => 1,
		'remhost' => 'quicklatex.com',
		'preamble' => '\usepackage{amsmath, amsfonts, amssymb}
			\usepackage{tikz}
			\usepackage[version=3]{mhchem}',
		'rnd' => rand()
	);
	
	$params = '';
	foreach($paramsArray as $key => $value){
		$params .= "$key=$value&";
	}
	$params = rtrim($params, '&');
	// echo $params . ' ';
	
	$response = rest_helper('http://quicklatex.com/latex3.f', $params, 'POST', 'text');
	
	$response_parts = explode(' ', $response);
	$url = $response_parts[0];
	$url = strstr($url, 'http');
	
	return $url;
}

function render_mathtran($formula) {
	return 'http://www.mathtran.org/cgi-bin/toy?D=1;tex=' . rawurlencode($formula);
}

function rest_helper($url, $params = null, $verb = 'GET', $format = 'json') {
  $cparams = array(
    'http' => array(
      'method' => $verb,
      'ignore_errors' => true
    )
  );
  if ($params !== null) {
    // $params = http_build_query($params); // we'll build our own query string for proper handling
    if ($verb == 'POST') {
      $cparams['http']['content'] = $params;
    } else {
      $url .= '?' . $params;
    }
  }

  $context = stream_context_create($cparams);
  $fp = fopen($url, 'rb', false, $context);
  if (!$fp) {
    $res = false;
  } else {
    // If you're trying to troubleshoot problems, try uncommenting the
    // next two lines; it will show you the HTTP response headers across
    // all the redirects:
    // $meta = stream_get_meta_data($fp);
    // var_dump($meta['wrapper_data']);
    $res = stream_get_contents($fp);
  }

  if ($res === false) {
    throw new Exception("$verb $url failed: $php_errormsg");
  }

  switch ($format) {
    case 'json':
      $r = json_decode($res);
      if ($r === null) {
        throw new Exception("failed to decode $res as json");
      }
      return $r;

    case 'xml':
      $r = simplexml_load_string($res);
      if ($r === null) {
        throw new Exception("failed to decode $res as xml");
      }
      return $r;
  }
  return $res;
}

?>