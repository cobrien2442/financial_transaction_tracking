/**
 * Create a trigger that executes the s1_lastDepDate function every day.
 * Execute this function to install the script.
 */
function setFincTrigger() {
  ScriptApp
    .newTrigger('s1_lastDepDate2')
    .timeBased()
    .everyMinutes(1)
    .create();
}

/**
 * Deletes all of the project's triggers
 * Execute this function to uninstall the script.
 */
function removeAllTriggers() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    ScriptApp.deleteTrigger(triggers[i]);
  }
}

function s1_lastDepDate2() {
  var search = 'Subject:direct deposit is available'; 
  var threads = GmailApp.search(search, 0, 1); // Get the latest thread only
  var msgs = GmailApp.getMessagesForThread(threads[0]); // Get messages for the latest thread
  var latestMessage = msgs[0];
  var mesdate = latestMessage.getDate();
  var depDate = Utilities.formatDate(mesdate, "GMT", "MM/dd/yyyy");
  var search = 'in:inbox subject:Wells Fargo Card -credit'; //-in:read from:alerts@notify.wellsfargo.com';
  s2_queryEmailsSend2AWS(depDate, search);
  var search = 'in:inbox subject:You made a credit card purchase'; //-in:read from:alerts@notify.wellsfargo.com';
  s2V1_queryEmailsSend2AWS(depDate, search);
}

function s2_queryEmailsSend2AWS(depDate, search) {
  // Sends info from emails to TransactionProcessor lambda
  var threads = GmailApp.search(search);
  var msgs = GmailApp.getMessagesForThreads(threads);

  for (var i = 0; i < msgs.length; i++) {
    for (var j = 0; j < msgs[i].length; j++) {
      var subject = msgs[i][j].getSubject();
      var body = msgs[i][j].getPlainBody();
      var d = new Date();
      var uDate = d.toISOString();
      // Send attachments to S3 storage 
      // Define regular expressions to match the required information
      const cardRegex = /\*Card\* \*ending in\* (\d{4})/;
      const card2Regex = /\*Card\* ending in (\d{4})/;
      const purchaseAmountRegex = /\*Purchase amount\* (\d+\.\d+) USD/;
      const merchantDetailsRegex = /\*Merchant details\* at (.+)/;
      const dateRegex = /\*Date\* ([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{4} [0-9]{2}:[0-9]{2} [APap][Mm] [A-Za-z\/]+)/;

      // Function to extract information from email
      function extractInfo(content) {
        const cardMatch = content.match(cardRegex);
        const cardMatch2 = content.match(card2Regex);
        const purchaseAmountMatch = content.match(purchaseAmountRegex);
        const merchantDetailsMatch = content.match(merchantDetailsRegex);
        const dateMatch = content.match(dateRegex);

        const info = {
          'Card': cardMatch ? cardMatch[1] : (cardMatch2 ? cardMatch2[1] : 'Not found'),
          'Purchaseamount': purchaseAmountMatch ? purchaseAmountMatch[1] : 'Not found',
          'Merchantdetails': merchantDetailsMatch ? merchantDetailsMatch[1] : 'Not found',
          'date': dateMatch ? dateMatch[1] : 'Not found'
        };

        return info;
      }

      // Parse the email content and extract the information
      const extractedInfo = extractInfo(body);

      var data = extractedInfo;
      data['depDate'] = depDate;
      data['upDate'] = uDate;

      var apiJawn = apiKey
  
      var headers = {"x-api-key": apiJawn};

      var options = {
        'payload': JSON.stringify(data),
        'headers': headers
      };

      Logger.log("s2_queryEmailsSend2AWS2()== > search, subject, & options:");
      Logger.log(options['payload']);
      Logger.log("  ");

      //Trouble shooting help (turn below two lines on to trouble shoot issues)
      //Logger.log("  " + subject);
      Logger.log("  " + body);

      //Put 'Try' statement here, if below three lines fail ==> send email info to yourself and stop script

      //var response = UrlFetchApp.fetch('https://1ntkk45k1b.execute-api.us-east-1.amazonaws.com/default/TransactionProcessor', options);
      //Logger.log(response.getContentText());
      //s3_runAthenaQuery2(depDate);
      //msgs[i][j].moveToTrash();
    }
  }
}

function s2V1_queryEmailsSend2AWS(depDate, search) {
  // Sends info from emails to TransactionProcessor lambda
  var threads = GmailApp.search(search);
  var msgs = GmailApp.getMessagesForThreads(threads);

  for (var i = 0; i < msgs.length; i++) {
    for (var j = 0; j < msgs[i].length; j++) {
      var subject = msgs[i][j].getSubject();
      var body = msgs[i][j].getPlainBody();
      var d = new Date();
      var uDate = d.toISOString();
      // Send attachments to S3 storage 
      // Define regular expressions to match the required information
      const cardRegex = /Credit card (\d{4})/;
      const purchaseAmountRegex = /Amount \$([\d.]+)/;
      const merchantDetailsRegex = /Merchant detail (.+)/;
      const dateRegex = /\*Date\* ([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{4} [0-9]{2}:[0-9]{2} [APap][Mm] [A-Za-z\/]+)/;

      // Function to extract information from email
      function extractInfo(content) {
        const cardMatch = content.match(cardRegex);
        const purchaseAmountMatch = content.match(purchaseAmountRegex);
        const merchantDetailsMatch = content.match(merchantDetailsRegex);
        const dateMatch = content.match(dateRegex);

        const info = {
          'Card': cardMatch ? cardMatch[1] : 'Not found',
          'Purchaseamount': purchaseAmountMatch ? purchaseAmountMatch[1] : 'Not found',
          'Merchantdetails': merchantDetailsMatch ? merchantDetailsMatch[1] : 'Not found',
          'date': dateMatch ? dateMatch[1] : msgs[i][j].getDate()
        };

        return info;
      }

      // Parse the email content and extract the information
      const extractedInfo = extractInfo(body);

      var data = extractedInfo;
      data['depDate'] = depDate;
      data['upDate'] = uDate;

      var apiJawn = apiKey
  
      var headers = {"x-api-key": apiJawn};

      var options = {
        'payload': JSON.stringify(data),
        'headers': headers
      };

      Logger.log("s2V1_queryEmailsSend2AWS2()== > search, subject, & options:");
      Logger.log(options['payload']);
      Logger.log("  ");

      //Trouble shooting help (turn below two lines on to trouble shoot issues)
      //Logger.log("  " + subject);
      //Logger.log("  " + body);

      //Put 'Try' statement here, if below three lines fail ==> send email info to yourself and stop script

      //create new Lambda func to upload info too

      //var response = UrlFetchApp.fetch('https://1ntkk45k1b.execute-api.us-east-1.amazonaws.com/default/TransactionProcessor', options);
      //Logger.log(response.getContentText());
      //s3_runAthenaQuery2(depDate);
      //msgs[i][j].moveToTrash();
    }
  }
}

function s3_runAthenaQuery2(depDate) {
  // Tells Athena to run Query via TransactionProcessor_step2 lambda
  var depDate1 = depDate

  var qstring = "SELECT SUM(purchaseamount) AS spent FROM cardtrans.financetrackingraw WHERE date_parse(date,'%m/%d/%Y') >= date_parse('" + depDate1 + "','%m/%d/%Y') and date_parse(depdate,'%m/%d/%Y') >= date_parse('" + depDate1 + "', '%m/%d/%Y')"

  var data = {
    'query' : qstring
  }

  var apiJawn = apiKey
  
  var headers = {
    "x-api-key": apiJawn
  };

  var options = {
    'payload': JSON.stringify(data),
    'headers': headers
  };

  // Tells Athena to run Query via TransactionProcessor_step2 lambda
  var response = UrlFetchApp.fetch('https://ly3uajvsh0.execute-api.us-east-1.amazonaws.com/default/TransactionProcessor_step2', options);
  var data = JSON.parse(response.getContentText());
  var queryExecutionId = data["QueryExecutionId"];

  Logger.log(queryExecutionId);

  Utilities.sleep(2 * 1000);

  s4_getAthenaResults2(queryExecutionId);
}

function s4_getAthenaResults2(queryExecutionId) {
  // Gets Athena results via TransactionProcessor_step3 lambda
  var formData = {
    'queryExecutionId': queryExecutionId,
  };

  var apiJawn = apiKey
  
  var headers = {
    "x-api-key": apiJawn
  }; 

  var options = {
    'payload': JSON.stringify(formData),
    'headers': headers
  };

  var response = UrlFetchApp.fetch('https://9g1falkc01.execute-api.us-east-1.amazonaws.com/default/TransactionProcessor_step3', options);
  var data = JSON.parse(response.getContentText());
  Logger.log(data);
  GmailApp.sendEmail("cobrien2442@gmail.com", "Card transaction", data);
}