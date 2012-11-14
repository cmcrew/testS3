var express = require('express');
var requestURL = require('request');
var moment = require('moment');
var ejs = require('ejs'); //embedded javascript template engine
var fs = require('fs');
var knox = require('knox');
var app = module.exports = express.createServer();

// YOUR BUCKET NAME
var myBucket = 'favorite_failure';

var S3Client = knox.createClient({
      key: process.env.AWS_KEY
    , secret: process.env.AWS_SECRET
    , bucket: myBucket
});


//------------------------SERVER CONFIGURATION--------------------//
app.configure(function() {
    
    app.register('html',require('ejs')); //use .html files in /views instead .ejs extension
    app.set('views', __dirname + '/views'); //store all templates inside /views
    app.set('view engine', 'ejs'); // ejs is our template engine
    app.set('view options',{layout:true}); // use /views/layout.html to manage your main header/footer wrapping template
    
    app.use(express.cookieParser());//Cookies must be turned on for Sessions
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    
    // define the static directory for css, img and js files
    app.use(express.static(__dirname + '/static'));
  
    /**** Turn on some debugging tools ****/
    app.use(express.logger());
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});
//----------------------------END SERVER CONFIGURATION-------------------------------------------//

// main page - display form
app.get('/', function(request, response) {
        
    // render the form
    response.render('form.html');
});

app.post('/', function(request,response) {
    console.log('saving new image');
    
    // 1) Get file information from submitted form
        filename = request.files.image.filename; // actual filename of file
        path = request.files.image.path; //will be put into a temp directory
        type = request.files.image.type; // image/jpeg or actual mime type
                
    // 2) create file name with logged in user id + cleaned up existing file name. function defined below.
        cleanedFileName = cleanFileName(filename);
        console.log('*******************cleaned file name***********************');
        console.log(cleanedFileName);
       
    // 3a) We first need to open and read the file
        fs.readFile(path, function(err, buf){
            
            // 3b) prepare PUT to Amazon S3
            var req = S3Client.put(cleanedFileName, {
              'Content-Length': buf.length
            , 'Content-Type': type
            });
            
            // 3c) prepare 'response' callback from S3
            req.on('response', function(res){
                console.log('Inside req.on');
                console.log(S3Client.bucket);
                
                if (200 == res.statusCode) {
                  console.log('Inside 200 == res.statusCode');
                  
                  response.redirect('/thanks');
                
                } else {
                
                    response.send("an error occurred. unable to upload profile photo");
                    console.log(err);
                
                }
            });
        
            // 3d) finally send the content of the file and end
            req.end(buf);
        });
     
});
app.get('/thanks', function(request,response) {
    response.render('thanks.html');
});

var cleanFileName = function(filename) {
    
    // cleans and generates new filename for example userID=abc123 and filename="My Pet Dog.jpg"
    // will return "abc123_my_pet_dog.jpg"
    fileParts = filename.split(".");
    
    //get the file extension
    fileExtension = fileParts[fileParts.length-1]; //get last part of file
    
    //add time string to make filename a little more random
    d = new Date();
    timeStr = d.getTime();
    
    //name without extension "My Pet Dog"
    newFileName = fileParts[0];
    
    return newFilename = timeStr + "_" + fileParts[0].toLowerCase().replace(/[^\w ]+/g,'').replace(/ +/g,'_') + "." + fileExtension;
    
}

// Make server turn on and listen at defined PORT (or port 3000 if is not defined)
var port = process.env.PORT || 3000;
app.listen(port, function() {
  console.log('Listening on ' + port);
});

// end of main page