'use strict';

const cors = require('cors');
const express = require('express');
const bodyParser = require('body-parser');
const process = require('process');
const url = require('url');
const queryString = require('querystring');

const OK = 200;
const CREATED = 201;
const BAD_REQUEST = 400;
const NOT_FOUND = 404;
const CONFLICT = 409;
const SERVER_ERROR = 500;


//Main URLs
const DOCS = '/docs';
const COMPLETIONS = '/completions';

//Default value for count parameter
const COUNT = 5;

/** Listen on port for incoming requests.  Use docFinder instance
 *  of DocFinder to access document collection methods.
 */
function serve(port, docFinder) {
  const app = express();
  app.locals.port = port;
  app.locals.finder = docFinder;
  setupRoutes(app);
  const server = app.listen(port, async function() {
    console.log(`PID ${process.pid} listening on port ${port}`);
  });
  return server;
}

module.exports = { serve };

function setupRoutes(app) {
  app.use(cors());            //for security workaround in future projects
  app.use(bodyParser.json()); //all incoming bodies are JSON
  //@TODO: add routes for required 4 services
  app.get(`${DOCS}/:id`,getDoc(app));
  app.get(`${COMPLETIONS}`,wordCompletion(app));
  app.get(`${DOCS}`,findWord(app));
  app.post(`${DOCS}`,createDoc(app));
  app.use(doErrors()); //must be last; setup for server errors   
}

function getDoc(app) {
  return errorWrap(async function(req, res) {
   try {
      const id = req.params.id;
      const results = await app.locals.finder.docContent(id);     
      const link = [{rel:'self',href:baseUrl(req,DOCS)+'/'+id}];
      const data = {content:results,links:link};
      res.json(data);
    }
    catch (err) {      
      const error = err.code === 'NOT_FOUND' ? 
       {code: "NOT_FOUND",
	message: err.message } 
      : { code: 'INTERNAL',
	  message: err.message        
        }
        res.statusCode = error.code === 'BAD_PARAM' ? BAD_REQUEST : (error.code === 'INTERNAL' ? SERVER_ERROR : NOT_FOUND)
      res.json(error);
    }
  });
}

function wordCompletion(app) {
  return errorWrap(async function(req, res) {   
   const q = req.query || {};
   try {      
      if(q.text === undefined){
            throw{
               isDomain: true,
               errorCode: 'BAD_PARAM',
               message: 'required query parameter \"text\" is missing',
            };
      }else{ 
	      const results = await app.locals.finder.complete(q.text);	             
	      res.json(results);	      
      }
    }
    catch (err) {
      const error = err.isDomain === true ? { 
	code: err.errorCode,
	message: err.message      } : { code: 'INTERNAL',
	  message: err.message        
        }
        res.statusCode = error.code === 'BAD_PARAM' ? BAD_REQUEST : (error.code === 'NOT_FOUND' ? NOT_FOUND : (error.code === 'INTERNAL' ? SERVER_ERROR : CONFLICT))
      res.json(error);
    }
  });
}


function findWord(app) {
  return errorWrap(async function(req, res) {    
   const qry = req.query || {};
   try {     
      let link = new Array();
      if(qry.q === undefined){
            throw{
               isDomain: true,
               errorCode: 'BAD_PARAM',
               message: 'required query parameter \"q\" is missing',
            };
      }else{             
              const results = await app.locals.finder.find(qry.q);
	      if (results.length === 0) {
		const self1 = {rel:'self',href:baseUrl(req,DOCS)+'?q='+qry.q.replace(" ",'%20')+"&start="+Number(0)+"&count="+COUNT};
		link.push(self1);                                    
                const resultset =  {results:results,totalCount:0,links:link};
                res.json(resultset);
	      }else{ 
				const totalcnt = results.length;
			        const resultarray = new Array();

			       let resultset;
                               if(qry.count !== undefined){
				      if(qry.count<0){
				        throw{
			       		    isDomain: true,
			       		    errorCode: 'BAD_PARAM',
			       		    message: 'bad query parameter \"count\"',
			    	        };
				      }
			       } 
			       if(qry.start !== undefined){
				  let num = Number(qry.start) === null? 0:Number(qry.start);				  
				  if(isNaN(num)){
                                      throw{
			       		    isDomain: true,
			       		    errorCode: 'BAD_PARAM',
			       		    message: 'bad query parameter \"start\"',
			    	      };				      
				  }else{                                      
				      for(let i = num;i<(num)+5 && i<results.length;i++){
                                           results[i]["href"] = baseUrl(req,DOCS)+'/'+results[i]["name"];  
				           resultarray.push(results[i]);
				      }
				      const self1 = {rel:'self',href:baseUrl(req,DOCS)+'?q='+qry.q.replace(" ",'%20')+"&start="+Number(num)+"&count="+COUNT};
				      link.push(self1);
				      let previous,next;
				      if((num)-5 >=0){
				          previous =  {rel:'previous',href:baseUrl(req,DOCS)+'?q='+qry.q.replace(" ",'%20')+"&start="+Number(Number(qry.start)-5)+"&count="+COUNT};
				          link.push(previous);   
				      }                  
				      
				      if((num)+5 <results.length){
				          next =  {rel:'next',href:baseUrl(req,DOCS)+'?q='+qry.q.replace(" ",'%20')+"&start="+Number(Number(qry.start)+5)+"&count="+COUNT};
				          link.push(next);   
				      } 
				      resultset =  {results:resultarray,totalCount:totalcnt,links:link} 
				  } 
			       }else{
                                    const resultarray = new Array();  
                                    for(let i = 0;i<5 && i<results.length;i++){
                                           results[i]["href"] = baseUrl(req,DOCS)+'/'+results[i]["name"];  
				           resultarray.push(results[i]);
				    }
				    const self1 = {rel:'self',href:baseUrl(req,DOCS)+'?q='+qry.q.replace(" ",'%20')+"&start="+Number(0)+"&count="+COUNT};
				    link.push(self1); 
                                    if(totalcnt>5){
                                     link.push({rel:'next',href:baseUrl(req,DOCS)+'?q='+qry.q.replace(" ",'%20')+"&start="+Number(5)+"&count="+COUNT});
                                    }  
                                    resultset =  {results:resultarray,totalCount:totalcnt,links:link};
				
			       }        
				res.json(resultset);
	      }
      }
    }
    catch (err) {
      const error = err.isDomain === true ? { 
	code: err.errorCode,
	message: err.message      } : { code: 'INTERNAL',
	  message: err.message        
        }
        res.statusCode = error.code === 'BAD_PARAM' ? BAD_REQUEST : (error.code === 'NOT_FOUND' ? NOT_FOUND : (error.code === 'INTERNAL' ? SERVER_ERROR : CONFLICT))
      res.json(error);
    }
  });
}

function createDoc(app){
return errorWrap(async function(req, res) {
    try {      
      const obj = req.body;
      if(obj.name === undefined || obj.name === null){
              throw{
               isDomain: true,
               errorCode: 'BAD_PARAM',
               message: 'required body parameter \"name\" is missing',
            };
      }else{
          if(obj.name !== undefined){
                if(obj.content === undefined){
                    throw{
               			isDomain: true,
               			errorCode: 'BAD_PARAM',
               			message: 'required body parameter \"content\" is missing',
            	   };
                }
          }
      }     
     const results = await app.locals.finder.addContent(obj.name,obj.content);
     const link = {href:baseUrl(req,DOCS)+'/'+obj.name};     
     res.statusCode=CREATED;
     res.json(link);
    }
    catch(err) {
      const error = err.isDomain === true ? { 
	code: err.errorCode,
	message: err.message      } : { code: 'INTERNAL',
	  message: err.message        
        }
      res.statusCode = error.code === 'BAD_PARAM' ? BAD_REQUEST : (error.code === 'NOT_FOUND' ? NOT_FOUND : (error.code === 'INTERNAL' ? SERVER_ERROR : CONFLICT))
      res.json(error);
    }
  });
}

//@TODO: add handler creation functions called by route setup
//routine for each individual web service.  Note that each
//returned handler should be wrapped using errorWrap() to
//ensure that any internal errors are handled reasonably.

/** Return error handler which ensures a server error results in nice
 *  JSON sent back to client with details logged on console.
 */ 
function doErrors(app) {
  return async function(err, req, res, next) {
    res.status(SERVER_ERROR);
    res.json({ code: 'SERVER_ERROR', message: err.message });
    console.error(err);
  };
}

/** Set up error handling for handler by wrapping it in a 
 *  try-catch with chaining to error handler on error.
 */
function errorWrap(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    }
    catch (err) {
      next(err);
    }
  };
}
  

/** Return base URL of req for path.
 *  Useful for building links; Example call: baseUrl(req, DOCS)
 */
function baseUrl(req, path='/') {
  const port = req.app.locals.port;
  const url = `${req.protocol}://${req.hostname}:${port}${path}`;
  return url;
}

