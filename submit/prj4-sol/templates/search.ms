<html>
  <head>
    <title>Documents Collections Search</title>
    <link rel="stylesheet" href="{{{base}}}/css/style.css">
  </head>
  <body>
    
    <h1>Documents Collection Search</h1>
    <div class="error">{{#error}}<ul><li>{{{_}}}</li></ul>{{/error}}</div>
    <form method="GET" action="{{{base}}}/search.html">
      <p>
        Please fill in one or more search terms in the field below:
      </p>
      <label>
        <span class="label">Search Terms:</span>
          <input id="query" name="q" value="{{value}}">
	</label>
	<br/>
      </label>
      <div class = "error">{{#errors}}{{_}}{{/errors}}
      </div>
      <input id="submit" name="submit" type="submit"
             value="search" class="control">
    </form>
<div>{{#result}}
       <h1>Search Result</h1>  
       {{#results}}
             <p class="result">
                    <a class="doc-name" href = {{href}}>{{name}}</a></br>
                    <p>{{#lines}}{{{.}}}{{/lines}}</p>
             </p>
       {{/results}}
       {{#links}}
             <a id = "{{rel}}" href = {{href}}>{{rel}}</a>
       {{/links}}  
     {{/result}}
</div>  
{{>footer}}
  </body>
</html>
