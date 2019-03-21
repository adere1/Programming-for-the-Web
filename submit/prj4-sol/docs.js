'use strict';

const express = require('express');
const upload = require('multer')();
const fs = require('fs');
const mustache = require('mustache');
const Path = require('path');
const { URL } = require('url');
const querystring = require('querystring');

const STATIC_DIR = 'statics';
const TEMPLATES_DIR = 'templates';

function serve(port, base, model) {
  const app = express();
  app.locals.port = port;
  app.locals.base = base;
  app.locals.model = model;
  process.chdir(__dirname);
  app.use(base, express.static(STATIC_DIR));
  setupTemplates(app, TEMPLATES_DIR);
  setupRoutes(app);
  app.listen(port, function() {
    console.log(`listening on port ${port}`);
  });
}


module.exports = serve;

/******************************** Routes *******************************/

function setupRoutes(app) {
  //@TODO add appropriate routes
  const base = app.locals.base;
  app.get(`${base}/search.html`, doSearch(app));
  app.get(`${base}/add.html`, doAdd(app));
  app.post(`${base}/add`, doAddContent(app));
  app.get(`${base}`, home(app));
  app.get(`${base}/:id`, doGet(app));
  
}

/*************************** Action Routines ***************************/

//@TODO add action routines for routes + any auxiliary functions.

function home(app){
 return async function(req, res) {
    res.redirect('homepage.html');    
  };
}


function doGet(app) {
  return async function(req, res) {
    const id = req.params.id;
    let model;
    try {
      const abc = await app.locals.model.get(id);      
      const doc = abc.content;	
      model = { base: app.locals.base, name: req.params.id, data: doc  };
    }
    catch (err) {
      console.error(err);
      let errmsg = (err.message) ? err.message : 'web service error';
      let errors = {_:errmsg};  
      model = {base: app.locals.base, errors: errors };
    }
    const html = doMustache(app, 'showdoc', model);
    res.send(html);    
  }
}

function doAdd(app){
	return async function(req, res) {
		let model;         
		try {                  
                     model =  { base: app.locals.base }  
                     const html = doMustache(app, "add", model);
                     res.send(html);
		}
                catch(err){
                    console.error(err);
      		    let errmsg = (err.message) ? err.message : 'web service error';
      		    let errors = {_:errmsg};  
      		    model = {base: app.locals.base, errors: errors };                    
                    const html = doMustache(app, "add", model);
                    res.send(html);
		}
	}
}

function doAddContent(app){
	app.post('/docs/add', upload.single('file'), async function (req, res, next) {		 
		  let model; 
                  	if(req.file === undefined){
                    		let errmsg = 'please select a file containing a document to upload';
      		    		let errors = {_:errmsg};  
      		    		model = {base: app.locals.base, errors: errors };
                    		const html = doMustache(app, "add", model);
                    		res.send(html);
                         }else{
				  try{				  
					  let postdata = { name: req.file.originalname.split(".txt")[0]  , content:req.file.buffer.toString('utf8')}
					  await app.locals.model.create(postdata);
				  }
				  catch(err){
				    console.error(err);
		      		    let errmsg = (err.message) ? err.message : 'web service error';
		      		    let errors = {_:errmsg};  
		      		    model = {base: app.locals.base, errors: errors };                            
				    const html = doMustache(app, "add", model);
				    res.send(html);
				      
				  }
                        }             
                   res.redirect(app.locals.base+"/"+req.file.originalname.split(".txt")[0]);
                                  
	})

 return async function(req, res) {
	        let model;
		try {
                   
		}
                catch(err){
		}
	}
}

function doSearch(app) {  
    let model, template;
  return async function(req, res) {    
      const isSubmit = req.query.submit !== undefined;
      let data = [];
      let errors = undefined;
      let error = undefined;
    
      if(req.query.q !== undefined){
	      if (  req.query.q.length == 0) {
		const msg = 'please specify one-or-more search terms';
		errors = Object.assign(errors || {}, { _: msg });
	      }
      
      if (errors === undefined) {
        const search = getNonEmptyValues(req.query);
	const q = querystring.stringify(search);        
	try {          
	  data = await app.locals.model.list(q);          
	}
	catch (err) {
          console.error(err);
	  error = {_:err.message ? err.message : 'web service error'};
	}        
        if(error === undefined && errors === undefined){
		if (data.results.length === 0) {
		  	error = {_: `no document containing "${req.query.q}" found; please retry`};
		  	console.error(error);  
		}
        }
      }
    }
    template =  'search';
    if(errors != undefined || error !=undefined){             
	    model =  {
	    	base: app.locals.base,
	    	errors: errors,
                error:error,
                value : req.query.q
	    };    
    }else{ 
	    if(data.results !== undefined){
               let query;
               if(req.query.q !== undefined){
               	  query = req.query.q.split(" ");                  
                  for(let i=0;i<query.length;i++){
                        query[i] = query[i][0].replace(/[^a-zA-Z0-9]/,"")+query[i].slice(1,query[i].length-1)+query[i][query[i].length-1].replace(/[^a-zA-Z0-9]/,"")
                  }                
               } 
	       for(let i=0;i<data.results.length;i++){
		    data.results[i].href = `${app.locals.base}/`+data.results[i].name;
                    if(req.query.q !== undefined){
                          for(let element of query){
                             for(let l =0; l< data.results[i].lines.length;l++){
                                     let reg1 = new RegExp(element,"ig");
                                     let reg2 = new RegExp(element,"i");                                     
                                     let matchword = data.results[i].lines[l].match(reg2);
                                     let htmlword = '<span class="search-term">'+ matchword +'</span>';
		                     data.results[i].lines[l] = data.results[i].lines[l].replace(reg1,htmlword);                                     
                             }                            
                          }
                    }	                      
	       }
              let link = new Array();
              for(let r=data.links.length-1;r>=0;r--){
                   if(data.links[r].rel === 'next' || data.links[r].rel === 'previous'){
                        let newurl = data.links[r].href;
                        if(data.links[r].rel === 'next'){
                          data.links[r].rel = 'Next'
                        }
                        if(data.links[r].rel === 'previous'){
                          data.links[r].rel = 'Previous'
                        }
                        data.links[r].href = `${app.locals.base}/search.html?`+newurl.split("?")[1]+'&submit=search'
                   	link.push(data.links[r]);
                   }   
              }
               data.links = link;    	      
	    }            
             model =  {
		    	base: app.locals.base,
		    	result: data,
                        value : req.query.q   
	     };
    } 
    const html = doMustache(app, template, model);
    res.send(html);
  };
};



/************************ General Utilities ****************************/

/** return object containing all non-empty values from object values */
function getNonEmptyValues(values) {
  const out = {};
  Object.keys(values).forEach(function(k) {
    const v = values[k];
    if (v && v.trim().length > 0) out[k] = v.trim();
  });
  return out;
}


/** Return a URL relative to req.originalUrl.  Returned URL path
 *  determined by path (which is absolute if starting with /). For
 *  example, specifying path as ../search.html will return a URL which
 *  is a sibling of the current document.  Object queryParams are
 *  encoded into the result's query-string and hash is set up as a
 *  fragment identifier for the result.
 */
function relativeUrl(req, path='', queryParams={}, hash='') {
  const url = new URL('http://dummy.com');
  url.protocol = req.protocol;
  url.hostname = req.hostname;
  url.port = req.socket.address().port;
  url.pathname = req.originalUrl.replace(/(\?.*)?$/, '');
  if (path.startsWith('/')) {
    url.pathname = path;
  }
  else if (path) {
    url.pathname += `/${path}`;
  }
  url.search = '';
  Object.entries(queryParams).forEach(([k, v]) => {
    url.searchParams.set(k, v);
  });
  url.hash = hash;
  return url.toString();
}

/************************** Template Utilities *************************/


/** Return result of mixing view-model view into template templateId
 *  in app templates.
 */
function doMustache(app, templateId, view) {  
  const templates = { footer: app.templates.footer };  
  return mustache.render(app.templates[templateId], view, templates);
}

/** Add contents all dir/*.ms files to app templates with each 
 *  template being keyed by the basename (sans extensions) of
 *  its file basename.
 */
function setupTemplates(app, dir) {
  app.templates = {};
  for (let fname of fs.readdirSync(dir)) {
    const m = fname.match(/^([\w\-]+)\.ms$/);
    if (!m) continue;
    try {
      app.templates[m[1]] =
	String(fs.readFileSync(`${TEMPLATES_DIR}/${fname}`));
    }
    catch (e) {
      console.error(`cannot read ${fname}: ${e}`);
      process.exit(1);
    }
  }
}

