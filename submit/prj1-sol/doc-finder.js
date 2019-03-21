const {inspect} = require('util'); //for debugging

'use strict';

class DocFinder {

  /** Constructor for instance of DocFinder. */
  constructor() {
    //@TODO    
    this.noise_w_set = new Set();    
    this.indexing_structure = {};    
    this.search_result;
    this.total_content = {};
    this.offset_data = {};    
    this.sort_line = {};    
   	this.word_suggestion_set;  	  
    this.counter = 0;  
    
  }

  /** Return array of non-noise normalized words from string content.
   *  Non-noise means it is not a word in the noiseWords which have
   *  been added to this object.  Normalized means that words are
   *  lower-cased, have been stemmed and all non-alphabetic characters
   *  matching regex [^a-z] have been removed.
   */
   
  words(content) {
    //@TODO
    let content_array = content.split(/\s+/);
    const normalized_content = content_array.map((w)=>normalize(w));
    const words = normalized_content.filter((w) => !this.noise_w_set.has(w));    
    return words;
  }

  /** Add all normalized words in noiseWords string to this as
   *  noise words. 
   */
  addNoiseWords(noiseWords) {
    //@TODO
    const temp_w_noise = new Set();
    this.words(noiseWords).forEach(function(element) {
  			temp_w_noise.add(element);
		});   	
		
		this.noise_w_set = temp_w_noise;
	    
  }

  /** Add document named by string name with specified content to this
   *  instance. Update index in this with all non-noise normalized
   *  words in content string.
   */ 
  addContent(name, content) {
    //@TODO	 
    
    let content_array = content.split(/\s+/);    
    const normalized_content = content_array.map((w)=>normalize(w));    
    const filtered_words = normalized_content.filter((w) => !this.noise_w_set.has(w));   
    this.indexing_structure[name] = new Map();    
    let index_stored ;    
    this.total_content[name] = new Array();
    this.total_content[name].push(content);    
    let doc_name = Object.keys(this.total_content);
    for(let l = 0;l<doc_name.length;l++){
     			this.offset_data[doc_name[l]] = new Map();
     			let matchword;
     			let temp_data = new Map();
     			while (matchword = WORD_REGEX.exec(this.total_content[doc_name[l]][0])) {
          				const [word, offset] = [matchword[0], matchword.index];         
         					if(!temp_data.has(normalize(word)))
          						temp_data.set(normalize(word),offset);
         
          }
          this.offset_data[doc_name[l]] = temp_data;
    }    
    
    for(const i of filtered_words){    	
    	if(this.indexing_structure[name].get(i) === undefined || this.indexing_structure[name].get(i) === "" ){
    				this.indexing_structure[name].set(i,1);   				
    	}			
    	else{
    		this.indexing_structure[name].set(i,this.indexing_structure[name].get(i)+1 ); 
    	}			
    }	
  }

  /** Given a list of normalized, non-noise words search terms, 
   *  return a list of Result's  which specify the matching documents.  
   *  Each Result object contains the following properties:
   *     name:  the name of the document.
   *     score: the total number of occurrences of the search terms in the
   *            document.
   *     lines: A string consisting the lines containing the earliest
   *            occurrence of the search terms within the document.  Note
   *            that if a line contains multiple search terms, then it will
   *            occur only once in lines.
   *  The Result's list must be sorted in non-ascending order by score.
   *  Results which have the same score are sorted by the document name
   *  in lexicographical ascending order.
   *
   */
  find(terms) {
  	
    //@TODO       
    let counter = 0;     
    let doc_name = Object.keys(this.indexing_structure);    
    this.search_result = new Array();    
   
   terms.forEach(function(element1){
    doc_name.forEach(function(element){
  			if(this.indexing_structure[element].get(element1)>0){
 					  counter ++;			  
 			      let index1,index2,index3;
 			      index1 = this.offset_data[element].get(element1); 			  
		 			  for(let k = index1;k>=0;k--){
		 			  	   if(this.total_content[element][0][k].match(/\n/)){
		 			  	   	index2 = k;
		 			  	   	break;
		 			  	   }	
		 			  } 			  
		 			  if(index2 === undefined)
		 			  {
		 			  	index2 = 0;
		 			  }	
 			  
 			  		let stored_index = index1;
		 			  while(!this.total_content[element][0][stored_index].match(/\n/)){
		 			  		stored_index++;
		 			  }	
		 			  	
		 			  index3  = stored_index;		 			  
		 			  let total_line = "";	 			  
		 			  		 			  
		 			  for(let i=index2+1;i<=index3;i++){
		 			  				total_line = total_line+this.total_content[element][0][i];
		 			  }
		 			  
		 			  if(this.sort_line[element] === undefined) 
		 			      this.sort_line[element]  = new Map();		 			  	 
		 			  this.sort_line[element].set(index2+1,total_line);			      
 			      
 			    let repeate_doc = false;
 			  	if(this.search_result.length > 0){
 			  		for(let i =0;i <  this.search_result.length;i++){ 			  			
 			  	    if(this.search_result[i].name === element){ 			  	    	
 			  	    	if(total_line !=  this.search_result[i].lines) 	    	
 			  	    	    this.search_result[i].lines = total_line + this.search_result[i].lines; 			  	    	
 			  	    	this.search_result[i].score = this.search_result[i].score + this.indexing_structure[element].get(element1); 			  	    
 			  	      repeate_doc = true;
 			  	      break;
 			  	    }	
 			  	  }			  	  
	 			  	if(!repeate_doc){
	 			  	  	this.search_result.push({'name':element,'score':this.indexing_structure[element].get(element1),'lines':""});	 			    			
	 			    }
 			    }else {
 			    	this.search_result.push({'name':element,'score':this.indexing_structure[element].get(element1),'lines':""}); 			    	
 			    } 			  		
 			  }	
 	 },this);	
 	},this); 	
      
   let doc_count = 0;   
   let saved_doc_name = Object.keys(this.sort_line);
   
   Object.values(this.sort_line).forEach(function(element){
      let sorted_array = ([...element.entries()].sort(function(a,b){return a[0] - b[0];}));
      let complete_line = "";      
      for(let i =0;i<sorted_array.length;i++){
        complete_line = complete_line + sorted_array[i][1];
      }      
      for(let i=0;i< this.search_result.length;i++){
        if(this.search_result[i].name === saved_doc_name[doc_count]){
             this.search_result[i].lines = complete_line;
        }
      }      
      doc_count ++;   
   },this);    
   	
   let temp,i,j;	
 	 for(i=1;i< this.search_result.length;i++){
 	 		 	temp = this.search_result[i];
 	 		 	for(j=i-1;j>=0 && compareResults(temp,this.search_result[j])<0;j--){
 	 		 	    this.search_result[j+1] = this.search_result[j]; 	 		 	   		 		
 	 		  } 	
 	 		  this.search_result[j+1] = temp;
 	 }
 	  this.sort_line = {};		 
    return this.search_result;
 }

  /** Given a text string, return a ordered list of all completions of
   *  the last word in text.  Returns [] if the last char in text is
   *  not alphabetic.
   */
  complete(text) {
    //@TODO
    const Regex = /^[A-Z]+$/i;
    this.word_suggestion_set = new Array();    
    if(text[text.length-1].match(Regex)){
        const Regex1 = new RegExp('/^' + text + '.*/i');        
        Object.keys(this.indexing_structure).forEach(function(element){
        	this.indexing_structure[element].forEach(function(value,key,map){        		
        		if(text === key.substring(0,text.length) && !this.word_suggestion_set.includes(key)){	
        			this.word_suggestion_set.push(key);  
        		}	
        	},this);
        },this);        
       return this.word_suggestion_set; 
 		 }else {
 		 	return [];
 		}   
  }
} //class DocFinder

module.exports = DocFinder;

/** Regex used for extracting words as maximal non-space sequences. */
const WORD_REGEX = /\S+/g;

/** A simple class which packages together the result for a 
 *  document search as documented above in DocFinder.find().
 */ 
class Result {
  constructor(name, score, lines) {
    this.name = name; this.score = score; this.lines = lines;
  }

  toString() { return `${this.name}: ${this.score}\n${this.lines}`; }
}

/** Compare result1 with result2: higher scores compare lower; if
 *  scores are equal, then lexicographically earlier names compare
 *  lower.
 */
function compareResults(result1, result2) {
  return(result2.score - result1.score) ||
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

