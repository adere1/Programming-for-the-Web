<html>
<head>
    <title>Add Document</title>
    <link rel="stylesheet" href="/docs/css/style.css">
  </head>
  <body>
    <h1>Add Document</h1>
    <ul>
    </ul>
    <form action="/docs/add" method="POST" enctype="multipart/form-data">
      <label>
        <span class="label">Choose file:</span>
        <input id="file" name="file" type="file">
      </label>
      <br/>
      <div class ="error">{{#errors}}{{_}}{{/errors}}</div>
      <input id="submit" name="submit" type="submit"
             value="add" class="control">
    </form>
{{>footer}}
</body>
</html>