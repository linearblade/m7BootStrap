<?php
  namespace lib\HTTP;
  use lib\utils\hash;
  
  class Request{

      static function parse($opts = []) {
	  $contentType = $_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? '';
	  $rawInput    = file_get_contents('php://input');
	  $requestData = $_REQUEST;
	  
	  // Detect JSON payload
	  if (
              stripos($contentType, 'application/json') !== false
              && !empty($rawInput)
	  ) {
              $json = json_decode($rawInput, true);
              if (json_last_error() === JSON_ERROR_NONE && is_array($json)) {
		  // Merge JSON into request, preserving form/query values
		  $requestData = array_merge($requestData, $json);
              }
	  }
	  $map =  hash::get($opts,'map');
	  if($map)
	      hash::mapTo($requestData, $map);
	  
	  return hash::get($opts,'inflate') ?
		 hash::inflate($requestData):
		 $requestData;
      }
  }
