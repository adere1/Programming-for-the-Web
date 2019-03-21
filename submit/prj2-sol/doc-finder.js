const assert = require('assert');
const mongo = require('mongodb').MongoClient;

const {inspect} = require('util'); //for debugging
'use strict';

/** This class is expected to persist its state.  Hence when the
 *  class is created with a specific database url, it is expected
 *  to retain the state it had when it was last used with that URL.
 */ 
class DocFinder {

  /** Constructor for instance of DocFinder. The dbUrl is
   *  expected to be of the form mongodb://SERVER:PORT/DB
   *  where SERVER/PORT specifies the server and port on
   *  which the mongo database server is running and DB is
   *  name of the database within that database server which
   *  hosts the persistent content provided by this class.
   */
  constructor(dbUrl) {
    //TODO
    this.db_name = dbUrl.slice(dbUrl.lastIndexOf("/")+1);
    this.db_url =  dbUrl.slice(0,dbUrl.lastIndexOf("/"));
    this.client;
    this.db;
    this.dbtable;
    this.dbtable1;
    this.dbtable2;
  }

  /** This routine is used for all asynchronous initialization
   *  for instance of DocFinder.  It must be called by a client
   *  immediately after creating a new instance of this.
   */
  async init() {
    //TODO
    this.client = await mongo.connect(this.db_url,{ useNewUrlParser: true });
    this.db = this.client.db(this.db_name);
    this.dbtable = this.db.collection("content");
    this.dbtable1 = this.db.collection("noiselist");
    this.dbtable2 = this.db.collection("wordsindex");
    this.insertdata = {} ;
    this.tempdata = new Array();
  }

  /** Release all resources held by this doc-finder.  Specifically,
   *  close any database connections.
   */
  async close() {
    //TODO
    await this.client.close();
  }

  /** Clear database */
  async clear() {
    //TODO    
    await this.db.dropDatabase();
    await this.close();
  }

  /** Return an array of non-noise normalized words from string
   *  contentText.  Non-noise means it is not a word in the noiseWords
   *  which have been added to this object.  Normalized means that
   *  words are lower-cased, have been stemmed and all non-alphabetic
   *  characters matching regex [^a-z] have been removed.
   */
  async words(contentText) {
    //TODO    
    let allwords = await this.wordsLow(contentText);    
    return allwords.map((pair) => pair[0]);   
  }

  /** Add all normalized words in the noiseText string to this as
   *  noise words.  This operation should be idempotent.
   */
  async addNoiseWords(noiseText) {
    //TODO
     let allwords = await this.words(noiseText);      
   		allwords.forEach(async function(element){           
          let m =   await this.dbtable1.updateOne({word:element},{$set:{word:element}},{upsert:true});
      },this);   
  }

  /** Add document named by string name with specified content string
   *  contentText to this instance. Update index in this with all
   *  non-noise normalized words in contentText string.
   *  This operation should be idempotent.
   */ 
  async addContent(name, contentText) {
    //TODO    
    let setcontent = {id:name,data:contentText};
    let dataset = new Array();   	
   	let content = await this.dbtable.find({id:name});
   	const tempcontent = await content.toArray();
   	if(tempcontent.length !== 0)
   			return    	
   	const updatedata = await this.dbtable.updateOne({id:name},{$set:setcontent},{upsert:true});	  
	  this.insertdata[name] = new Map();	  
        let wordlist = await this.wordsLow(contentText);        
          for(const element of wordlist){
          let counter1 = 1,offset1 = element[1],line = element[2] ;                 
	     			if(this.insertdata[name] === undefined){
	     				this.insertdata[name].set(element[0],{offset:offset1,counter:counter1,lines:line}); 
	     				dataset.push({id:name, words: element[0],offset: offset1, counter:counter1,lines:line});
	     			}	
	          else{
	            if(this.insertdata[name].get(element[0]) === undefined){
	               this.insertdata[name].set(element[0],{offset:offset1,counter:counter1,lines:line});  
	               dataset.push({id:name, words: element[0],offset: offset1, counter:counter1,lines:line});   
	            }else {
	              let tempoffset = this.insertdata[name].get(element[0]).offset;
	              let tempcounter = this.insertdata[name].get(element[0]).counter+1; 
	              let templine = this.insertdata[name].get(element[0]).lines;
	              this.insertdata[name].set(element[0],{offset:tempoffset,counter:tempcounter,lines:templine});  
	              let ind = dataset.findIndex(word=> word.words === element[0]); 
	              dataset[ind].counter = tempcounter;	              
	            }
	          }          
        }      
     let insertinfo = await this.dbtable2.insertMany(dataset);        
  }
   
  /** Return contents of document name.  If not found, throw an Error
   *  object with property code set to 'NOT_FOUND' and property
   *  message set to `doc ${name} not found`.
   */
  async docContent(name) {
    //TODO    
    let findresult = await this.dbtable.findOne({id:name});
    let errorstring = "doc "+name+" not found";
    let error = {code:'NOT_FOUND',message:errorstring}    
    try{
    	 if(findresult.data !== null){ 
    	    let returnval = findresult.data;
    	    return returnval;
    	 }      
     }catch (err){
        throw error;
     }
  }
  
  /** Given a list of normalized, non-noise words search terms, 
   *  return a list of Result's  which specify the matching documents.  
   *  Each Result object contains the following properties:
   *
   *     name:  the name of the document.
   *     score: the total number of occurrences of the search terms in the
   *            document.
   *     lines: A string consisting the lines containing the earliest
   *            occurrence of the search terms within the document.  The 
   *            lines must have the same relative order as in the source
   *            document.  Note that if a line contains multiple search 
   *            terms, then it will occur only once in lines.
   *
   *  The returned Result list must be sorted in non-ascending order
   *  by score.  Results which have the same score are sorted by the
   *  document name in lexicographical ascending order.
   *
   */
  async find(terms) {
    //TODO    
    let savedata = [];
    const resultdata = []; 
    const result = [];    
    for(const element of terms){
     	const reg1 = new RegExp(element); 
     	const finddata = await this.dbtable2.find({words:element});     
     	savedata.push(await finddata.toArray());     
    }       
    for(const element1 of savedata){
       for(const element2 of element1){          
		       	resultdata.push(new Result(element2.id, element2.counter, element2.offset,element2.lines))
		   }
    }       
    resultdata.sort(function(a,b){
	     if(a.name.localeCompare(b.name) === 0)
	      return a.offset-b.offset
	     else
	      return a.name.localeCompare(b.name) 
     });     
    for(const element of resultdata){
        if(result.length === 0){
          result.push(new Result(element.name, element.score, element.offset,element.lines))
        }else {
        	let ind = result.findIndex(id1 => id1.name === element.name)
        	if(ind !== undefined && ind !== -1){	
	        		result[ind].score = result[ind].score + element.score;       		
				      if(result[ind].lines !== element.lines){
				           result[ind].lines = result[ind].lines+element.lines;
				      }
				      result[ind].offset = element.offset; 				         		
		      }else {
		         		  result.push(new Result(element.name, element.score, element.offset,element.lines));
		      }	               
				}     
     } 
     
   return result.length !== 0 ? result.sort(compareResults) : [];    	
  }

  /** Given a text string, return a ordered list of all completions of
   *  the last normalized word in text.  Returns [] if the last char
   *  in text is not alphabetic.
   */
  async complete(text) {
    //TODO
    const Regex = /^[A-Z]+$/i;
    this.word_suggestion_set = new Array();    
    if(text[text.length-1].match(Regex)){
	       const reg  = '^' + text;
	       const reg1 = new RegExp(reg);       
	       const getwords = await this.dbtable2.find({words:reg1});       
	       let tempwords = await getwords.toArray(); 
	       let allwords = new Array(); 
	       tempwords.forEach(function(element){
		        let checkduplicates = allwords.includes(element.words);         
		        if(checkduplicates === false){
		        	allwords.push(element.words)
		        }         
	       });
	       allwords.sort();             
	       return allwords; 
 		 }else {
 		 		return [];
 		}  
  }

//Add private methods as necessary
   
 async wordsLow(content) {
    const words = [];
    let match;   
    while (match = WORD_REGEX.exec(content)) {
	      const word = normalize(match[0]);
	      let indx = match.index;      
	      let k = await this.dbtable1.find({word:word}).toArray();      
	      while(content[indx] !== null && content[indx] !== undefined  && !content[indx].match(/\n/)){
				         indx--;
				}
				indx++;
				let line = "";
				while(content[indx] !== null && content[indx] !== undefined  && !content[indx].match(/\n/)){
				       line = line+content[indx];
				       indx++;
				}
				line = line + "\n"
	      if (word && k[0] === undefined) {
						words.push([word, match.index,line]);
	      }
    }   
    return words;
  }
} //class DocFinder

module.exports = DocFinder;

//Add module global functions, constants classes as necessary
//(inaccessible to the rest of the program).

//Used to prevent warning messages from mongodb.
const MONGO_OPTIONS = {
  useNewUrlParser: true
};

/** Regex used for extracting words as maximal non-space sequences. */
const WORD_REGEX = /\S+/g;

/** A simple utility class which packages together the result for a
 *  document search as documented above in DocFinder.find().
 */ 
class Result {
  constructor(name, score, offset,lines) {
    this.name = name; this.score = score; this.offset = offset; this.lines = lines;
  }

  toString() { return `${this.name}: ${this.score}\n${this.lines}`; }
}

/** Compare result1 with result2: higher scores compare lower; if
 *  scores are equal, then lexicographically earlier names compare
 *  lower.
 */
function compareResults(result1, result2) {
  return (result2.score - result1.score) ||
    result1.name.localeCompare(result2.name);
}

/** Normalize word by stem'ing it, removing all non-alphabetic
 *  characters and converting to lowercase.
 */
function normalize(word) {
  return stem(word.toLowerCase()).replace(/[^a-z]/g, '');
}

/** Place-holder for stemming a word before normalization; this
 *  implementation merely removes 's suffixes.
 */
function stem(word) {
  return word.replace(/\'s$/, '');
}


