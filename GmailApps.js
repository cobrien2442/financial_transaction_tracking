/**
 * Create a trigger that executes the s1_lastDepDate function every day.
 * Execute this function to install the script.
 */
function setFincTrigger() {
    ScriptApp
      .newTrigger('s1_lastDepDate')
      .timeBased()
      .everyMinutes(1)
      .create()
  }
  
  /**
   * Deletes all of the project's triggers
   * Execute this function to unintstall the script.
   */
  function removeAllTriggers() {
    var triggers = ScriptApp.getProjectTriggers()
    for (var i = 0; i < triggers.length; i++) {
      ScriptApp.deleteTrigger(triggers[i])
    }
  }
  
  function s1_lastDepDate() {
    var search = 'Subject:direct deposit is available'; 
    //var search = 'in:inbox -in:read subject:Wells Fargo Card ';
    var threads = GmailApp.search(search, 0, 1); // Get the latest thread only
    var msgs = GmailApp.getMessagesForThread(threads[0]); // Get messages for the latest thread
    var latestMessage = msgs[0]
    var mesdate = latestMessage.getDate()
    //Logger.log(mesdate);
    var depDate = Utilities.formatDate(mesdate, "GMT", "MM/dd/yyyy");
    Logger.log("depDate: " + depDate);
    s2_queryEmailsSend2AWS(depDate)
  }
  
  
  function s2_queryEmailsSend2AWS(depDate) {
    //sends info from emails to TransactionProcessor lambda
    //var search = 'in:inbox -in:read subject:jawntty'; 
    var search = 'in:inbox -in:read subject:Wells Fargo Card ';
  var threads = GmailApp.search(search);
    var msgs = GmailApp.getMessagesForThreads(threads);
    var arry = []
    for (var i = 0 ; i < msgs.length; i++) {
      for (var j = 0; j < msgs[i].length; j++) {
        let index = arry.length
        var subject = msgs[i][j].getSubject();
        var body = msgs[i][j].getPlainBody();
        //var body = msgs[i][j].getBody();
        var d = new Date();
        var uDate = d.toISOString();
        var subBody = 'Subject==>' + '\r' + subject + '\r' + 'Body==>' + '\r' + body 
        //var subBody = ( '{' + '\r' + 'Subject : ' + subject + '\r' + '}' + '\r' + '{' + '\r' + 'Body : ' + body + '\r' + '}' )
                //Send attachments to S3 storage 
  
          //Logger.log(bodyblob.getName())//,options)
          //Logger.log(body)
          //Logger.log(subject)
  const emailContent = body; // Paste the email content here
  
  // Define regular expressions to match the required information
  const cardRegex = /\*Card\* ending in (\d{4})/;
  const purchaseAmountRegex = /\*Purchase amount\* (\d+\.\d+) USD/;
  const merchantDetailsRegex = /\*Merchant details\* at (.+)/;
  const dateRegex = /\*Date\* ([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{4} [0-9]{2}:[0-9]{2} [APap][Mm] [A-Za-z\/]+)/
  
  // Function to extract information from email
  function extractInfo(content) {
    const cardMatch = content.match(cardRegex);
    const purchaseAmountMatch = content.match(purchaseAmountRegex);
    const merchantDetailsMatch = content.match(merchantDetailsRegex);
    const dateMatch = content.match(dateRegex);
  
    const info = {
      Card: cardMatch ? cardMatch[1] : 'Not found',
      'Purchaseamount': purchaseAmountMatch ? purchaseAmountMatch[1] : 'Not found',
      'Merchantdetails': merchantDetailsMatch ? merchantDetailsMatch[1] : 'Not found',
      'date': dateMatch ? dateMatch[1] : 'Not found'
    };
  
    return info;
  }
  
  // Parse the email content and extract the information
  const extractedInfo = extractInfo(emailContent);
  
  var data = extractedInfo;
  data['depDate'] = depDate
  data['upDate'] = uDate
  //Logger.log(data)
  var options = {
    // Convert the JavaScript object to a JSON string.
    'payload' : JSON.stringify(data),
    };
          
          //Logger.log(data)
          //Logger.log(options)
          var response = UrlFetchApp.fetch('https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/devtest/TransactionProcessor', options);
          //Logger.log(response.getAllHeaders());
          Logger.log(response.getContentText());
          s3_runAthenaQuery()
          msgs[i][j].moveToTrash();
        }
  
      }
  }
  
  function s3_runAthenaQuery() {
    //tells Athena to run Query via TransactionProcessor_step2 lambda
      var response = UrlFetchApp.fetch('https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/default/TransactionProcessor_step2')
      var data = JSON.parse(response.getContentText());
      var queryExecutionId = data["QueryExecutionId"];
  
    Logger.log(queryExecutionId);
  
    Utilities.sleep(2*1000);
  
    s4_getAthenaResults(queryExecutionId)
  }
  
  function s4_getAthenaResults(queryExecutionId){
    //gets Athena results via TransactionProcessor_step3 lambda
  var formData = {
    'queryExecutionId': queryExecutionId,
  };
      var options = {
    //'method' : 'put',
    //'payload' : formData
    'payload' : JSON.stringify(formData)
    };
    var response = UrlFetchApp.fetch('https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/default/TransactionProcessor_step3', options);
    var data = JSON.parse(response.getContentText());
    //amount = data[1]
    //Logger.log(amount);
    Logger.log(data)
    GmailApp.sendEmail("cobrien2442@gmail.com", "Card transaction", data);
  }