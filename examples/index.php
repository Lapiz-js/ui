<!DOCTYPE html>
<html>
  <head>
    <title>Examples Index</title>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  </head>
  <body>
  Lapiz UI Examples
  <ul>
    <?php
      $htmlFiles = glob('*.html');
      foreach($htmlFiles as $file){
        print("<li><a href='$file' target='_blank'>$file</a></li>");
      }
    ?>
  </ul>
  </body>
</html>