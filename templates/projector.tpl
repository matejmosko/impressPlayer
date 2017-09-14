<!DOCTYPE html>
<html>

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=1280" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <title>impressPlayer Projector</title>
  <link rel="stylesheet" href="{{{appPath}}}/css/styles-projector.css">
  <script>
  </script>
</head>

<body>
  <div class="rules" style="display:none">
    <h2>Toto sú pravidlá</h2>
    <ul>
      <li>Toto sú pravidlá</li>
    </ul>
  </div>
  <div id="container">
    <webview id="impressCurrent" src="{{{usrPath}}}/viewer.html" autosize style="display:flex;" nodeintegration></webview>
    <div class="impressCurtain"></div>
  </div>

</body>
<script id="require">
  // You can also require other files to run in this process
  require({{{projectorPath}}});
</script>

</html>
