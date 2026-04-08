<?php
  namespace lib\utils;
  /*
     Copyright 2010 Henry Goss, swift ventures inc, m7.org
     sin_vraal@hotmail.com
     https://m7.org
     dont forget to merge with swiftco hash.php for remaining functions.
     
   */
  use \lib\utils\boolean;
  use \utils;
  class hash {

      const STRICT = 1;
      const COMPOSITE_TO_SCALAR = 2;
      
      public static function set(&$rec,$target=null,$value){
	  if(!$target ){
              $rec = $value;
              return;
	  }
	  if (is_string($target))$target= explode('.',$target);
	  
	  if (!is_array($target) || !count($target))return null;
	  if(!is_object($rec) && !is_array($rec))$rec=array();

	  $key = $target[0];

	  if (count($target)>1){
              $nRec =is_object($rec) ?
		     (
			 property_exists($rec,$key)?$rec->$key:array()
		     ):
		     (
			 array_key_exists($key,$rec)?$rec[$key]:array()
		     );

	      #$nRec = array_key_exists($key,$rec)?$rec[$key]:array();
              if(!is_array($nRec))$nRec = array();

	      if(is_object($rec)){
		  $rec->$key = static::set($nRec,array_slice($target,1),$value);
	      }else {
		  $rec[$key] = static::set($nRec,array_slice($target,1),$value);
	      }
	      #$rec[$key] = static::set($nRec,array_slice($target,1),$value);
	  }else {
	      if(is_object($rec))   $rec->key = $value;
	      else   $rec[$key] = $value;
	  }
	  return $rec;

      }

      static function increment(&$rec,$target=null, $data){
	  $data = intval($data)?intval($data):1;
	  $value = self::get($rec,$target);
	  $value = intval($value) + $data;
	  self::set($rec,$target,$value);
      }
      static function decrement(&$rec,$target=null, $data){
	  $data = intval($data)?intval($data):1;
	  $value = self::get($rec,$target);
	  $value = intval($value) - $data;
	  self::set($rec,$target,$value);
      }

      static function push(&$rec, $target=null,$data){
	  $stack = self::get($rec,$target);
	  if(!is_array($stack))
	      $stack = [];
	  $stack[] = $data;
	  return self::set($rec,$target,$stack);
      }
      
      static public function delete(&$rec,$target=null){
	  if (!$rec) return;
          if(!$target ){
              unset($rec);
	      return;
          }

	  if (is_string($target))$target= explode('.',$target);
          if (!is_array($target)) return;
	  if (!is_array($rec))return;
          if (!count($target)){
	      unset($rec);
	      return;
	  }


          $key = $target[0];
          if (count($target)>1){
              if (!array_key_exists($key,$rec))return;
              if(!is_array($rec[$key]))return;
              static::delete($rec[$key],array_slice($target,1));
	  }else {
              unset ($rec[$key] );
	  }
          return ;

      }

      //takes a string hash or array and normalizes it for indexing.
      public static function normalize($obj,$opts = null){
          $out = array();
	  if (!is_array($obj) &&  !is_string($obj) ) throw new \Exception("not a string hash or array");
	  $obj = is_string($obj)?preg_split('/\s+/', trim($obj)):$obj;
	  $opts = static::to($opts, 'default');
	  $def = isset($opts['default'])?$opts['default']:true;

	  foreach ($obj as $key=>$val){

	      if(is_int($key) ){
		  $out[$obj[$key]] = $def=='!key'?$obj[$key]:$def;
	      }else {
		  $tDef= $def =='!key' ?$key:$def;
		  $out[$key] = empty($val) || is_int($val)?$tDef:$val;
	      }
	  }
	  #dump::json($out);
	  return $out;
      }
      
      public static function on ($array, $on,$val=null){
	  $out = array();
	  foreach ($array as $item){
	      $key = static::get($item, $on);
	      $out[$key]= is_string($val)?$item[$val]:$item;
	  }
	  return $out;
      }


      public static function exclude($rec,$list,$opts=null){
	  if (is_string($list) && !empty($list)) $list = utils::toArray($list, " ");
	  $exc = static::normalize($list);
	  $out = array();

	  #if ($opts['deep'] )
	  $rec = array_replace_recursive([],$rec);
	  foreach ($list as $key){
	      static::delete($rec,$key);
	  }
	  return $rec;
      }
      
      public static function slice($rec, $list,$opts=null){
	  $opts = static::to($opts, 'set');
	  $flags = "".$opts['set'];
	  #dump::json($opts);
	  if (is_string($list)) $list= explode(" ", $list);
	  if(empty($list))$list = array_keys($rec);
	  $output = array();
	  foreach ($list as $key){
	      $val = static::get($rec,$key);

	      if(static::exists($rec,$key) || boolean::explicitTrue($flags) ){
		  //print "is true:($key :{$rec[$key]}) || {$opts['set']}\n";
		  if(!boolean::explicitTrue($flags)) {
		      // Skip if 'l' flag and val is empty string (including '') or null
		      if(preg_match('/l/', $flags) && ( (is_string($val) && strlen($val) < 1) || $val === null ))  continue;
		      //if(preg_match ('/l/', $flags) && (is_string($val) && strlen($val) <1 ) || $val ===null)continue;
		      if(preg_match ('/d/', $flags) && $val ===null)continue;
		  }
		  //print "setting $key $val\n";
		  static::set($output, $key, $val);
	      }
	  }
	  return $output;
      }
      
      public static function getUntil($rec,$list,$def=null){
	  if (is_string($list)) $list= explode(" ", $list);
	  foreach ($list as $key){
	      $val = static::get($rec, $key);
	      if(!empty($val))return $val;
	  }
	  return $def;
      }
      public static function getUntilExists($rec,$list,$def=null){
	  if (is_string($list)) $list= explode(" ", $list);
	  foreach ($list as $key){
	      if(static::exists($rec,$key) ){
		  return static::get($rec,$key);
	      }
	  }
	  return $def;
      }

      /*php is a cludgy piece of shit language*/
      public static function get($rec, $target){
	  if(!isset($rec) || (!is_object($rec) && !is_array($rec)) )return null;
	  #if(!isset($rec) ||  !is_array($rec)) return null;

	  if(!isset($target) ) {
	      return $rec;
	  }
	  if(!is_array($target)) $target = explode(".",$target);
	  if(!count($target))return $rec;
	  $cur = array_shift($target);
	  #$rem = implode(".",$target);
	  #print "cur = $cur : $rem\n";

	  if (is_object($rec)) {
	      
	      if (property_exists($rec,$cur) && !count($target) )return $rec->$cur;
	      return static::get(
		  (property_exists($rec,$cur)?$rec->$cur:null),
		  $target
	      );
	  }else {
	      if (isset($rec[$cur]) && !count($target))return $rec[$cur];
	      return static::get(isset($rec[$cur])?$rec[$cur]:null, $target);
	  }


      }

      public static function exists($rec, $target)
      {
	  // No record or target → nothing to check
	  if ($target === null || $target === '')    return false;
	  // Normalize path
	  if (!is_array($target))  $target = explode('.', $target);
	  if (!count($target))  return false;
	  // Must be array or object to traverse
	  if (!is_array($rec) && !is_object($rec)) return false;
	  $cur = array_shift($target);

	  if (is_array($rec)) {
              // Key must exist, even if value is null
              if (!array_key_exists($cur, $rec)) {
		  return false;
              }
              $next = $rec[$cur];
	  } else {
              // Object property check
              if (!property_exists($rec, $cur)) {
		  return false;
              }
              $next = $rec->$cur;
	  }

	  // Last segment: exists if we got here
	  if (!count($target)) return true;

	  // Recurse into nested structure
	  return self::exists($next, $target);
      }
      
      /*php is a cludgy piece of shit language*/
      public static function dexists($rec, $target){
	  if(!isset($rec) || !is_array($rec))return false;
	  if(!isset($target) ) return $rec;
	  if(!is_array($target)) $target = explode(".",$target);
	  if(!count($target))return true;
	  $cur = array_shift($target);
	  #$rem = implode(".",$target);
	  #print "cur = $cur : $rem\n";

	  if (isset($rec[$cur]) && !count($target))return true;
	  return static::exists(
	      (
		  isset($rec[$cur])?
		  $rec[$cur]:
		  null
	      ),
	      $target
	  );


      }

      public static function fromArray($keys, $list,$trim=null){
	  $list = utils::toArray($list, " ");
	  $keys = utils::toArray($keys, " ");
	  $out = array();
	  if($trim){
	      while(null === end($list) )array_pop($list);
	      $count = count($list) < count($keys)?count($list):count($keys);
	  }else {
	      $count = count($keys);
	  }
	  #dump::json($list);
	  for ($i=0;$i<count($keys);$i++){
	      static::set($out, $keys[$i], @$list[$i]);
	  }
	  return $out;
      }
      public static function to($obj,$hotkey=null){
	  //if (!$obj)return null;
	  if (self::is($obj))return $obj;
	  #print "not a hash\n";
	  $def = array();
	  if (!empty($hotkey) &&  is_string($hotkey))$def[$hotkey] = $obj;
	  return $def;

      }
      public static function is($array){
	  if (!is_array($array)) return false;
	  $keys = array_keys($array);
	  #dump::json($array);
	  if (count($array) == 0 )return true; //it could be. could not be. php gayness
	  #print "got here\n";
	  #print_r($keys);
	  #print_r(array_keys($keys));
	  return array_keys($keys) !== $keys;
      }

      static public function isEmpty($hash,$key){
	  $val = self::get($hash,$key);
	  return empty($val);
      }

      /*
      public static function setDefault(&$array, $key, $default, $checkExists = false)
      {
	  if ($checkExists) {
              // Only set if the key is missing entirely
              if (!self::exists($array, $key)) {
		  self::set($array, $key, $default);
              }
	  } else {
              // Set if value is empty or null
              $val = self::get($array, $key);
              if (empty($val) && $val !== 0 && $val !== '0') {
		  self::set($array, $key, $default);
              }
	  }
      }
      */
      public static function setDefault(&$array,$key, $default,$exists=false)
      {
	  $val = $exists?
		 self::exists($array,$key):
		 self::get($array, $key);
	  if(!$val){
	      if (is_callable($default)) {
		  $default = call_user_func($default);
              }
	      self::set($array, $key,$default);
	  }
      }

      public static function getDefault($array,$key, $default=null,$exists=false){
	  return self::orDefault($array,$key,$default,$exists);
      }
      public static function orDefault($array, $key, $default=null,$exists=false){
	  if (!static::is($array) )return $default;
	  if ($exists){
	      return self::exists($array,$key)? self::get($array,$key) : $default;
	  }
	  $val = static::get($array,$key);
	  return empty($val)?$default:$val;
      }

      public static function deepCopy($array) {
	  return array_map(function($value) {
	      return is_object($value) ? clone $value : (is_array($value) ? static::deepCopy($value) : $value);
	  }, $array);
      }

      static public function mergeArray($arr,$opts=null){
	  if(!(is_array($arr) && !self::is($arr) ))
	      throw new Exception("hash::mergeArray :array supplied is not an array of hash");
	  $out = [];
	  foreach($arr as $item){
	      if($opts === false) $out = array_merge($out,$item);
	      else $out = self::merge($out,$item,$opts);
	  }
	  return $out;
      }
      static public function merge ($left , $right,$opts = null){
	  $opts = static::to($opts);
	  #if (!( lib.utils.isHash(left) && lib.utils.isHash(right))) return undefined;
	  $left = static::deepCopy($left);
	  $right = static::deepCopy($right);
	  $hmap = array('array'=> 'a', 'hash'=>'h');
	  //(isHash(opts) && ('disp' in opts))?opts.disp:
	  static $disp_default = null;
	  if ( $disp_default === null){
              $disp_default = [
		  'hh' => function ($l,$r,$opts=null){return hash::merge($l,$r,$opts);},
		  'as' => function ($l,$r,$opts=null){$l[]= $r; return $l;},
		  'aa' => function ($l,$r,$opts=null){return array_merge($l,$r);},
		  'default' => function ($l,$r,$opts=null){
		      //print "merge default\n";dump::json($r);
		      return $r;
		  }
              ];
	  }
	  $baseType = function($var){
	      if(hash::is($var) )return 'hash';
	      if(is_array($var) )return 'array';
	      return 'other';
	  };

	  $disp = static::exists($opts,'disp') ?array_merge($disp_default,$opts['disp']):$disp_default;
	  $keys = array_keys($right);
	  foreach ($keys as $p){
	      $lType = $baseType(@$left[$p]);
	      $rType = $baseType(@$right[$p]);
	      $type = static::orDefault($hmap,$lType,'s') . '' . static::orDefault($hmap,$rType,'s') ;
	      if (!static::exists($disp, $type) )$type= 'default';
	      $left[$p] = $disp[$type](@$left[$p],@$right[$p],$opts);
	  }
	  return $left;
      }

      static function validKey($key){
	  return  (!utils::emptyNonZero($key)  && ( is_numeric($key) || is_string($key) ) );
      }
      static function expand($rec ,$targets=null,$flags=null){
	  $list = empty($targets)?
		  self::keys($rec):
		  (
		      is_string($targets)?preg_split('/\s+/', $targets):$targets
		  );
	  $out = array();
	  foreach ($list as $item){
	      if($flags & self::COMPOSITE_TO_SCALAR ){
		  $get =  static::get($rec,$item);
		  $out[] = self::validKey($get)?$get:utils::type($get);
	      }else
		  $out[] =  static::get($rec,$item);
	  }

	  return $out;
      }


      /*
	 #tests if all keys are present in hash , logical and, logical or on groups
	 takes an array of arrays, or a string such as " x y, a b c"
	 return (  (x && y) || (a && b && c)  )
       */

      
      static public function has(){
	  return call_user_func_array('self::hasAll', func_get_args() );
	  #return self::hasAll(...func_get_args());
      }

      static public function hasAll($hash, $gList, $opts=null){
          $opts = self::to($opts, 'defined');
	  if (is_string($gList))$gList = trim($gList);
	  $groups = utils::toArray($gList, ",");
	  foreach ($groups as $list){
	      if (self::_hasAll($hash, $list,$opts) )return true;
	  }
	  return false;
      }

      static public function _hasAll($hash, $list,$opts=null){
          $opts = self::to($opts, 'defined');
	  if (is_string($list))$list = trim($list);
	  $list = utils::toArray($list, " ");
          if(!is_array($hash))return false;
          foreach ($list as $k){
              if (!isset($hash[$k]) )return false;
              if(@$opts['defined'] && empty($hash[$k]))return false;
	      if(array_key_exists('eq',$opts) && $hash[$k] != @$opts['eq'])return false;
          }
	  #print "returning true\n";
          return true;
      }

      /*
	 test presence of keys using logical or, logical or on groups
	 takes an array of arrays, or a string such as " x y, a b c"
	 return (  (x || y) || (a || b || c)  )
       */
      static public function hasAny($hash, $gList, $opts=null){
          $opts = self::to($opts, 'defined');
	  if (is_string($gList))$gList = trim($gList);
	  
	  $groups = utils::toArray($gList, ",");
	  foreach ($groups as $list){
	      if (self::_hasAny($hash, $list,$opts) )return true;
	  }
	  return false;
      }
      
      #checks hash has one of the keys in list
      static public function _hasAny($hash, $list,$opts=null){
          $opts = self::to($opts, 'defined');
	  if (is_string($list))$list = trim($list);

	  $list = utils::toArray($list, " ");
          if(!is_array($hash))return false;

          foreach ($list as $k){
              if(@$opts['defined'] && empty($hash[$k]))continue;
	      if(array_key_exists('eq',$opts) && $hash[$k] != @$opts['eq'])continue;
              else if (isset($hash[$k]) )return true;

          }

          return false;
      }

      
      #implement a full mapper later;
      #expects a hash, or an array of hash. fails otherwise.
      static public function reKey($hash, $src, $dst=null){
	  if (!is_array($hash))return null;

	  if ($dst){
	      if(isArray($hash)){
		  $list = $hash;
		  $out = [];
		  foreach($list as $item){
		      if (!isHash($item))return null;
		      $item[$dst] =$item[$src];
		      unset ($item[$src]);
		      $out[]=$item;
		  }
		  return $out;
	      }else{
		  $hash[$dst] =$hash[$src];
		  unset ($hash[$src]);
		  return $hash;
	      }
	  }
	  return $hash;
      }

      //helper function to append targets
      static public function makeTarget(){
	  $list =  call_user_func_array('self::makeTargetArray', func_get_args());
	  return empty($list)?null:join (".", $list);
      }
      static public function makeTargetArray(){
	  $args = func_get_args();
	  $out = [];
	  foreach ($args as $item){
	      if( empty($item) ) continue;
	      $out = array_merge($out, utils::toArray($item,".") );
	  }

	  return count($out)?$out:null;

      }

      static public function splitKey($key,$n=1,$opts = null){
	  #$opts = static::to($opts, 'str'); if (!isset($opts['str'])) $opts['str'] = true;
	  $key = static::makeTargetArray($key);
	  $start = array_slice($key, 0,$n);
	  $stop = array_slice($key,$n);
	  return $str?array(static::makeTarget($start), static::makeTarget($stop) ): array($start,$stop);
      }

      
      static public function extract($hash,$key){
	  $out = [];
	  if (static::is($hash) )
	      foreach ($hash as $k=>$rec)
		  $out[$k] = static::get($rec,$key);
	  else
	      foreach ($hash as $rec)
		  $out[] = static::get($rec,$key);

	  return $out;
	  //$column = array_column($hash, $key);
	  //$result = array_combine(array_keys($hash), $column);
	  //return $result;
      }

      static public function first($array,$val=false) {
	  if (is_array($array)) {
              reset($array);
              return $val?$array[key($array)]:key($array);
	  }
	  return null;
      }

    

      static public function keys(&$obj,$opts = null){
	  if (empty($obj))return null;
	  $out = array();
	  
	  if (!is_array($obj) &&  !is_string($obj) ) throw new \Exception("not a string hash or array");
	  $obj = is_string($obj)?preg_split('/\s+/', trim($obj)):$obj;
	  $opts = self::to($opts, 'index');
	  $def = isset($opts['index'])?$opts['index']:true;
	  $forceKey= @$opts['key'];
	  foreach ($obj as $key=>$val){
	      if(!$forceKey && is_int($key) ){
		  $out[] = $def?$obj[$key]:$def;
	      }else {
		  #$out[] = $obj[$key];
		  $out[] = $key;
	      }
	  }

	  return $out;

	  
	  if (empty($obj))return null;
	  if(!hash::is($obj) ) throw new \Exception('array keys: not a hash');
	  return array_keys($obj);
      }

      /*
      function array_key_first(&$array) {
	  if (empty($array)) {
              return null;
	  }

	  // Store current key position
	  $originalKey = key($array);

	  // Obtain the first key
	  reset($array);
	  $firstKey = key($array);

	  // Reset position back to the stored value
	  if ($originalKey !== null) {
              while (key($array) !== $originalKey) {
		  next($array);
              }
	  }

	  return $firstKey;
      }
      */

      static function sliceReg($hash,$list , $patt,$opts=null){
	  $list = empty($list)?self::keys($hash) : utils::toArray($list," ");
	  $opts = self::to($opts,"strip");
	  $out = array();
	  foreach ($list as $k){
              if (empty($k) ) continue;
              if (preg_match($patt, $k) ){
		  $sK = @$opts['strip']?preg_replace($patt, '', $k):$k;
		  $out[$sK] = $hash[$k];
		  #$out[$k] = $hash[$k];
              }
	  }
	  return $out;
      }

      static function keyToArray($key){
	  if (empty($key) ) return null;
	  if (!is_array($key) ){
	      $key = explode (".",$key);
	  }
	  return $key;

	  
      }
      static function keyPath($key){
	  $key = self::keyToArray($key);
	  #\dump::json($key);
          return count($key) <2 ?null:implode(".",array_slice($key, 0, count($key) - 1) );
      }
      static function keyStem($key){
	  $key = self::keyToArray($key);
	  return count($key)?end($key):null;
      }
      //fluffs a flat hash (ie from query string) into a nested hash.
      public static function inflate($flat)
      {
	  if (!is_array($flat)) return [];

	  $out = [];

	  foreach ($flat as $key => $val) {
              if (!is_string($key)) continue;
              self::set($out, $key, $val);
	  }

	  return $out;
      }


      /**
       * Remap keys in an associative array using dot-notation.
       *
       * Example:
       *   hash::mapTo($data, ['auth_id' => 'auth.id']);
       *
       * @param array &$hash  Input array (modified in place)
       * @param array $map    Key map ['from' => 'to']
       * @return array        The updated array
       */
      public static function mapTo(&$hash, $map = [],$opts=null)
      {
	  $opts = self::to($opts);
	  if (!self::is($hash) || !self::is($map) || empty($map)) {
              return $hash;
	  }

	  foreach ($map as $src => $dst) {
              // Skip invalid mappings
              if (!(arr::is($src) || is_string($src)) || !(arr::is($dst) ||is_string($dst) )) {
		  continue;
              }

              // Only proceed if key actually exists (even if value is null)
              if (!self::exists($hash, $src)) {
		  continue;
              }

              $val = self::get($hash, $src);

              // Set new key and remove old key
              self::set($hash, $dst, $val);
              self::delete($hash, $src);
	  }

	  return $hash;
      }
  }
