<?php
  namespace lib\HTTP;
  use lib\utils\arr;


   function arrTo($input,$split = null,$opts=null){
       $opts = is_array($opts)?$opts : ['trim' => $opts];
       //$opts = opts::slackParse2($opts,'trim');
          if ($input ===null)return array();
          if (!is_array($input)){
              if ($split){
                  $parts = explode($split, $input);
                  if($opts['trim'])
                      foreach($parts as $i =>$p)
                          $parts[$i] = trim($p);
                  return $parts;
              }
              return array($input);
          }
          if (hash::is($input))return array($input);
          return $input; //its an array
      }
  
  class Normalize {
	  /**
	   * Normalize a URI or structured array into parts,
	   * optionally stripping one or more leading segments.
	   *
	   * @param string|array $uri   Raw URI string or structured hash.
	   * @param string|array $strip String or list of leading parts to strip.
	   * @return array {
	   *     @type string $uri       Normalized URI path.
	   *     @type array  $parts     URI path segments.
	   *     @type string $qs        Query string (if any).
	   *     @type bool   $stripped  Whether one or more leading segments were stripped.
	   * }
	   */
	  public static function uri($uri, $strip = '')
	  {
              // --- If input is already a hash (structured result) ---
              if (is_array($uri)) {
		  $parts = isset($uri['parts']) ? $uri['parts'] : array();
		  $qs    = isset($uri['qs'])    ? $uri['qs']    : '';
		  $stripped = false;

		  $stripList = arr::to($strip);
		  if (!empty($stripList)) {
                      foreach ($stripList as $expect) {
			  if (isset($parts[0]) && $parts[0] === $expect) {
                              array_shift($parts);
                              $stripped = true;
			  }
                      }
		  }

		  return array(
                      'uri'      => '/' . implode('/', $parts),
                      'parts'    => $parts,
                      'qs'       => $qs,
                      'stripped' => $stripped
		  );
              }

              // --- Otherwise, treat input as a raw URI string ---
              $split  = explode('?', $uri, 2);
              $path   = $split[0];
              $qs     = isset($split[1]) ? $split[1] : '';

              // split on multiple slashes, removing empty segments
              $segments = preg_split('#/+#', $path, -1, PREG_SPLIT_NO_EMPTY);
              $stripped = false;

              // normalize $strip → array
              $stripList = arr::to($strip);
              if (!empty($stripList)) {
		  foreach ($stripList as $expect) {
                      if (isset($segments[0]) && $segments[0] === $expect) {
			  array_shift($segments);
			  $stripped = true;
                      }
		  }
              }

              return array(
		  'uri'      => '/' . implode('/', $segments),
		  'parts'    => $segments,
		  'qs'       => $qs,
		  'stripped' => $stripped
              );
	  }
      
      /**
       * Normalize a URI string or structured array into components.
       *
       * @param string|array $uri   Full URI or already-parsed hash.
       * @param string       $strip Leading segment to strip (e.g., "api").
       * @return array {
       *     @type string $uri       Normalized URI path.
       *     @type array  $parts     URI segments.
       *     @type string $query     Query string (if any).
       *     @type bool   $stripped  Whether a leading segment was stripped.
       * }
       */
      static function duri($uri, $strip = '') {
	  // --- If input is already a hash (structured result) ---
	  if (is_array($uri)) {
              $parts = $uri['parts'] ?? [];
              $qs    = $uri['qs'] ?? '';
              $stripped = false;

              // strip again if needed
              if ($strip && isset($parts[0]) && $parts[0] === $strip) {
		  array_shift($parts);
		  $stripped = true;
              }

              return [
		  'uri'      => '/' . implode('/', $parts),
		  'parts'    => $parts,
		  'qs'       => $qs,
		  'stripped' => $stripped
              ];
	  }

	  // --- Otherwise, treat input as a raw URL string ---
	  $parts = explode('?', $uri, 2);
	  $path  = $parts[0];
	  $qs    = $parts[1] ?? '';

	  // split on multiple slashes, removing empty segments
	  $segments = preg_split('#/+#', $path, -1, PREG_SPLIT_NO_EMPTY);
	  $stripped = false;

	  // strip leading base part if it matches
	  if ($strip && isset($segments[0]) && $segments[0] === $strip) {
              array_shift($segments);
              $stripped = true;
	  }

	  return [
              'uri'      => '/' . implode('/', $segments),
              'parts'    => $segments,
              'qs'       => $qs,
              'stripped' => $stripped
	  ];
      }


      /**
       * Parse and normalize a full URL into components.
       *
       * @param string $uri  A full or partial URL (e.g. https://example.com:8080/api/v2?x=1)
       * @return array {
       *     @type string|null $protocol  The scheme (e.g. "https", "http")
       *     @type string|null $host      The host (e.g. "example.com")
       *     @type int|null    $port      The port number, if specified
       *     @type string      $path      The normalized path portion (defaults to "/")
       *     @type string|null $query     The query string (without "?")
       *     @type string|null $fragment  The URL fragment (without "#")
       *     @type string|null $user      The username, if present
       *     @type string|null $pass      The password, if present
       *     @type string      $origin    scheme://host[:port]
       *     @type string      $href      Reconstructed full URL
       * }
       */
      public static function url($uri)
      {
          if (empty($uri) || !is_string($uri)) {
              return [];
          }

          $parsed = parse_url($uri);

          if ($parsed === false) {
              return [];
          }

          // Normalize pieces
	  // Normalize pieces (PHP 5 compatible)
          $scheme   = isset($parsed['scheme'])   ? $parsed['scheme']   : null;
          $host     = isset($parsed['host'])     ? $parsed['host']     : null;
          $port     = isset($parsed['port'])     ? $parsed['port']     : null;
          $path     = isset($parsed['path'])     ? $parsed['path']     : '/';
          $query    = isset($parsed['query'])    ? $parsed['query']    : null;
          $fragment = isset($parsed['fragment']) ? $parsed['fragment'] : null;
          $user     = isset($parsed['user'])     ? $parsed['user']     : null;
          $pass     = isset($parsed['pass'])     ? $parsed['pass']     : null;
	  
          // Build origin
          $origin = $scheme && $host
          ? $scheme . '://' . $host . ($port ? ":$port" : '')
		  : null;

          // Reconstruct full href
          $href = $origin . $path;
          if ($query)    $href .= '?' . $query;
          if ($fragment) $href .= '#' . $fragment;

          return [
              'protocol' => $scheme,
              'host'     => $host,
              'port'     => $port,
              'path'     => $path,
              'query'    => $query,
              'fragment' => $fragment,
              'user'     => $user,
              'pass'     => $pass,
              'origin'   => $origin,
              'href'     => $href,
          ];
      }
      
  }
