<?php

  $r = Request::parse([
      'inflate' => true,
      'map' =>  [
          'auth_user'   => 'auth.user',
          'auth_code'   => 'auth.code',
          'auth_id'     => 'auth.id',
          'auth_method' => 'auth.method',
          'auth_token'  => 'auth.token',
          'auth_pass'   => 'auth.pass',
          'auth_org'    => 'auth.org'
      ]
  ]);
