/**
 * Create a trigger that executes the s1_lastDepDate function every day.
 * Execute this function to install the script.
 */
function setFincTrigger() {
  ScriptApp
    .newTrigger('s1_lastDepDate')
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

function s1_lastDepDate() {
  var search = 'Subject:direct deposit is available'; 
  var threads = GmailApp.search(search, 0, 1); // Get the latest thread only
  var msgs = GmailApp.getMessagesForThread(threads[0]); // Get messages for the latest thread
  var latestMessage = msgs[0];
  var mesdate = latestMessage.getDate();
  var depDate = Utilities.formatDate(mesdate, "GMT", "MM/dd/yyyy");

  var search = 'in:inbox -in:read subject:Wells Fargo Card -credit -withdrawal from:alerts@notify.wellsfargo.com';
  var ccPay = 0
  s2_queryEmailsSend2AWS(depDate, search, ccPay);

  var search = 'in:inbox -in:read subject:You made a credit card purchase from:alerts@notify.wellsfargo.com';
  var ccPay = 1
  s2_queryEmailsSend2AWS(depDate, search, ccPay);

  //var search = 'in:inbox -in:read subject:You made a payment from:alerts@notify.wellsfargo.com';
  //var ccPay = 2
  //s2_queryEmailsSend2AWS(depDate, search, ccPay);

  var search = 'in:inbox -in:read subject:Wells Fargo card withdrawal exceeded preset amount from:alerts@notify.wellsfargo.com'
  var ccPay = 3
  //s2_queryEmailsSend2AWS(depDate, search, ccPay);

  search = 'in:inbox -in:read subject:Account update from:alerts@notify.wellsfargo.com'
  ccPay = 4
  //s2_queryEmailsSend2AWS(depDate, search, ccPay);
}

function s2_queryEmailsSend2AWS(depDate, search, ccPay) {
  // Sends info from emails to TransactionProcessor lambda
  var threads = GmailApp.search(search);
  var msgs = GmailApp.getMessagesForThreads(threads);

  if (ccPay < 2){
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
        const cardCredRegex = /Credit card (\d{4})/;
        const purchaseAmountRegex = /\*Purchase amount\* (\d+\.\d+) USD/;
        const purchaseAmountCredRegex = /Amount \$([\d.]+)/;
        const merchantDetailsRegex = /\*Merchant details\* at (.+)/;
        const merchantDetailsCredRegex = /Merchant detail (.+)/;
        const dateRegex = /\*Date\* ([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{4} [0-9]{2}:[0-9]{2} [APap][Mm] [A-Za-z\/]+)/;
        const dateCredRegex = /\*Date\* ([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{4} [0-9]{2}:[0-9]{2} [APap][Mm] [A-Za-z\/]+)/;

        // Function to extract information from email
        function extractInfo(content) {
          const cardMatch = content.match(cardRegex);
          const cardMatch2 = content.match(card2Regex);
          const cardMatch3 = content.match(cardCredRegex);
          const purchaseAmountMatch = content.match(purchaseAmountRegex);
          const purchaseAmountMatch2 = content.match(purchaseAmountCredRegex);
          const merchantDetailsMatch = content.match(merchantDetailsRegex);
          const merchantDetailsMatch2 = content.match(merchantDetailsCredRegex);
          const dateMatch = content.match(dateRegex);
          const dateMatch2 = content.match(dateCredRegex);

          var formattedDate = Utilities.formatDate(msgs[i][j].getDate(), "EST", "MM/dd/yyyy hh:mm a");

          const info = {
            'Card': cardMatch ? cardMatch[1] : (cardMatch2 ? cardMatch2[1] : (cardMatch3 ? cardMatch3[1] : 'Not found')),
            'Purchaseamount': purchaseAmountMatch ? purchaseAmountMatch[1] : (purchaseAmountMatch2 ? purchaseAmountMatch2[1] : 'Not found'),
            'Merchantdetails': merchantDetailsMatch ? merchantDetailsMatch[1] : (merchantDetailsMatch2 ? merchantDetailsMatch2[1] : 'Not found'),
            'date': dateMatch ? dateMatch[1] : (dateMatch2 ? dateMatch2[1] : formattedDate)
          };

          return info;
        }

        // Parse the email content and extract the information
        const extractedInfo = extractInfo(body);

        var data = extractedInfo;
        data['depDate'] = depDate;
        data['upDate'] = uDate;
        data['subject'] = subject;
        data['ccPay'] = ccPay;

        var apiJawn = apiKey
    
        var headers = {"x-api-key": apiJawn};

        var options = {
          'payload': JSON.stringify(data),
          'headers': headers
        };

        Logger.log(options['payload']);
        //Logger.log("  " + body);
        //Logger.log("  ");

        //Trouble shooting help (turn below two lines on to trouble shoot issues)
        //Logger.log("  " + subject);
        //Logger.log("  " + body);

        //Put 'Try' statement here, if below three lines fail ==> send email info to yourself and stop script
        try {
          var response = UrlFetchApp.fetch('https://1ntkk45k1b.execute-api.us-east-1.amazonaws.com/default/TransactionProcessor', options);
          Logger.log(response.getContentText());
          s3_runAthenaQuery(depDate);
          msgs[i][j].moveToTrash();
        }catch(error){
          Logger.log(error);
          Logger.log(subject);
          msgs[i][j].star()
          msgs[i][j].markRead();
        }
      }
    }
  } 
  
  if(ccPay == 3){

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
        const cardCredRegex = /Credit card (\d{4})/;
        const purchaseAmountRegex = /\*Withdrawal amount\* (\d+\.\d+) USD/;
        const purchaseAmountCredRegex = /Amount \$([\d.]+)/;
        const merchantDetailsRegex = /\*Merchant details\* at (.+)/;
        const merchantDetailsCredRegex = /Merchant detail (.+)/;
        const dateRegex = /\*Date\* ([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{4} [0-9]{2}:[0-9]{2} [APap][Mm] [A-Za-z\/]+)/;
        const dateCredRegex = /\*Date\* ([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{4} [0-9]{2}:[0-9]{2} [APap][Mm] [A-Za-z\/]+)/;

        // Function to extract information from email
        function extractInfo(content) {
          const cardMatch = content.match(cardRegex);
          const cardMatch2 = content.match(card2Regex);
          const cardMatch3 = content.match(cardCredRegex);
          const purchaseAmountMatch = content.match(purchaseAmountRegex);
          const purchaseAmountMatch2 = content.match(purchaseAmountCredRegex);
          const merchantDetailsMatch = content.match(merchantDetailsRegex);
          const merchantDetailsMatch2 = content.match(merchantDetailsCredRegex);
          const dateMatch = content.match(dateRegex);
          const dateMatch2 = content.match(dateCredRegex);

          var formattedDate = Utilities.formatDate(msgs[i][j].getDate(), "EST", "MM/dd/yyyy hh:mm a");

          const info = {
            'Card': cardMatch ? cardMatch[1] : (cardMatch2 ? cardMatch2[1] : (cardMatch3 ? cardMatch3[1] : 'Not found')),
            'Purchaseamount': purchaseAmountMatch ? purchaseAmountMatch[1] : (purchaseAmountMatch2 ? purchaseAmountMatch2[1] : 'Not found'),
            'Merchantdetails': merchantDetailsMatch ? merchantDetailsMatch[1] : (merchantDetailsMatch2 ? merchantDetailsMatch2[1] : 'WITHDRAW'),
            'date': dateMatch ? dateMatch[1] : (dateMatch2 ? dateMatch2[1] : formattedDate)
          };
          return info;
        }
        const extractedInfo = extractInfo(body);

        var data = extractedInfo;
        data['depDate'] = depDate;
        data['upDate'] = uDate;
        data['subject'] = subject;
        data['ccPay'] = ccPay;

        var apiJawn = apiKey
    
        var headers = {"x-api-key": apiJawn};

        var options = {
          'payload': JSON.stringify(data),
          'headers': headers
        };

        //Logger.log("s2_queryEmailsSend2AWS2()== > search, subject, & options:");
        //Logger.log(options['payload']);
        //Logger.log("  " + body);
        //Logger.log("  ");

        //Trouble shooting help (turn below two lines on to trouble shoot issues)
        //Logger.log("  " + subject);
        //Logger.log("  " + body);

        //Put 'Try' statement here, if below three lines fail ==> send email info to yourself and stop script
        try {
          var response = UrlFetchApp.fetch('https://1ntkk45k1b.execute-api.us-east-1.amazonaws.com/default/TransactionProcessor', options);
          Logger.log(response.getContentText());
          s3_runAthenaQuery(depDate);
          msgs[i][j].moveToTrash();
        }catch(error){
          Logger.log(error);
          Logger.log(subject);
          msgs[i][j].star()
          msgs[i][j].markRead();
        }
      }
    }
  } 

  if(ccPay == 4){
    
    for (var i = 0; i < msgs.length; i++) {
      for (var j = 0; j < msgs[i].length; j++) {
        var subject = msgs[i][j].getSubject();
        var body = msgs[i][j].getPlainBody();
        var d = new Date();
        var uDate = d.toISOString();

        var withdrawalRegex = /\*Withdrawals\*(.*?)This information is accurate as of/gs;
        var withdrawalMatches = withdrawalRegex.exec(body);

        //var accountidRegex = /Here is the update you requested for your Wells Fargo account XXXXXXXXX(\d{4})/;
        var accountidRegex = /Here is the update you requested for your Wells Fargo account\s.+(\d{4})/;
        var accountid = accountidRegex.exec(body);
        if (accountid) {
          var accountidDigits = accountid[1];
          }


        if (withdrawalMatches && withdrawalMatches.length > 1) {
          var extractedContent = withdrawalMatches[1].trim();
          var lines = extractedContent.split(/(?<=\$\d+\.\d+)\s/);

          //Logger.log(lines);

          for (var k = 0; k < lines.length; k++) {
            //var line = lines[k].trim();
            //var line = lines[k].replace(/\r/g, ' ').trim();
            var line = lines[k].replace(/\n/g, ' ').replace(/\r/g, ' ').replace(/  /g, ' ').trim();



          // Define regular expressions to match the required information
          //const cardRegex = /\*Card\* \*ending in\* (\d{4})/;
          const cardRegex = /CARD (\d{4})/;
          const card2Regex = /Card\s\s(\d{4})/;
          const cardCredRegex = /Credit card (\d{4})/;
          //const purchaseAmountRegex = /\$([\d.]+)/;
          const purchaseAmountRegex = /\$(.+)/;
          const purchaseAmountCredRegex = /\b\$[\d.]+/g;
          const dateRegex = /(\d{1,2}\/\d{1,2})/;
          const dateCredRegex = /\s(\d{1,6})\s/;
          const merchantDetailsRegex = /PURCHASE AUTHORIZED ON \d{1,2}\/\d{1,2} ([^C]+(?:C(?!ARD)[^C]*)*)/;
          //const merchantDetailsCredRegex = /PURCHASE AUTHORIZED ON \d{1,2}\/\d{1,2} (.+)/;
          const merchantDetailsCredRegex = /([^\d]+)\s\d/;
          const merchantDetails2Regex = /ONLINE TRANSFER REF .+ TO WELLS FARGO ACTIVE CASH VISA CARD .+(\d{4}) ON/;

          //NOTE: date info LA Fit => MMDDYY, Venmo => YYMMDD, Houseing => MMDDYY


          // Function to extract information from email
          function extractInfo(content) {
            const cardMatch = content.match(cardRegex);
            const cardMatch2 = content.match(card2Regex);
            const cardMatch3 = content.match(cardCredRegex);
            const purchaseAmountMatch = content.match(purchaseAmountRegex);
            const purchaseAmountMatch2 = content.match(purchaseAmountCredRegex);
            const merchantDetailsMatch = content.match(merchantDetailsRegex);
            const merchantDetailsMatch3 = content.match(merchantDetailsCredRegex);
            //const merchantDetailsMatch2 = "credit card payment to " + content.match(merchantDetails2Regex);
            const merchantDetailsMatch2 = content.match(merchantDetails2Regex);
            const dateMatch = content.match(dateRegex);
            const dateMatch2 = content.match(dateCredRegex);

            var formattedDate = Utilities.formatDate(msgs[i][j].getDate(), "EST", "MM/dd/yyyy hh:mm a");

            const info = {
              'Card': cardMatch ? cardMatch[1] : (cardMatch2 ? cardMatch2[1] : (cardMatch3 ? cardMatch3[1] : 'ACH')),
              'Purchaseamount': purchaseAmountMatch ? purchaseAmountMatch[1] : (purchaseAmountMatch2 ? purchaseAmountMatch2[1] : 'Not found'),
              //'Merchantdetails': merchantDetailsMatch ? merchantDetailsMatch[1] : (merchantDetailsMatch2 ? merchantDetailsMatch2[1] : 'Not found'),
              'Merchantdetails': merchantDetailsMatch ? merchantDetailsMatch[1] : (merchantDetailsMatch2 ? "credit card payment for card " + merchantDetailsMatch2[1] : (merchantDetailsMatch3 ? merchantDetailsMatch3[1] : 'Not found')),
              'date': dateMatch ? dateMatch[1] : (dateMatch2 ? dateMatch2[1] : formattedDate)
            };
            return info;
          }
          const extractedInfo = extractInfo(line);

          var data = extractedInfo;

          data['accountid'] = accountidDigits;
          data['depDate'] = depDate;
          data['upDate'] = uDate + k;
          data['ccPay'] = ccPay;

          //NOTE: use Udate with [k] value as upload name to help avoid overwrites

          var apiJawn = apiKey
    
          var headers = {"x-api-key": apiJawn};
  
          var options = {
            'payload': JSON.stringify(data),
            'headers': headers
          }

          try {
            var response = UrlFetchApp.fetch('https://1ntkk45k1b.execute-api.us-east-1.amazonaws.com/default/TransactionProcessor', options);
            Logger.log(response.getContentText());
            s3_runAthenaQuery(depDate);
            msgs[i][j].moveToTrash();
          }catch(error){
            Logger.log(error);
            Logger.log(subject);
            msgs[i][j].star()
            msgs[i][j].markRead();
          }

        }

        } else {
          Logger.log('No match found.');
        }
      }
    }
  }
}



function s3_runAthenaQuery(depDate) {
  //function s3_runAthenaQuery() {
  //var depDate = '11/29/2023'
  Logger.log('s3_runAthenaQuery')
  // Tells Athena to run Query via TransactionProcessor_step2 lambda
  var depDate1 = depDate

  var qstring = "SELECT card, purchaseamount, merchantdetails, date, depdate, " +
    "time, ccpay, subject, purchrange, day_of_the_week " +
    "FROM cardtrans.financetrackingraw " +
    "WHERE date_parse(date,'%m/%d/%Y') >= date_parse('" + depDate1 + "','%m/%d/%Y') " +
    "and date_parse(depdate,'%m/%d/%Y') >= date_parse('" + depDate1 + "', '%m/%d/%Y') " +
    "GROUP BY card, purchaseamount, merchantdetails, date, depdate, " +
    "time, ccpay, subject, purchrange, day_of_the_week";

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
  var rdata = JSON.parse(response.getContentText());
  var queryExecutionId = rdata["QueryExecutionId"];

  Logger.log(queryExecutionId);

  Utilities.sleep(2 * 1000);

  const MILLIS_PER_DAY = 1000 * 60 * 60 * 24;

  let objectDate = new Date();
  Logger.log(objectDate);

  let twoWeeksAgo = new Date(objectDate - 14 * MILLIS_PER_DAY);
  let oneWeekAgo = new Date(objectDate - 7 * MILLIS_PER_DAY);
  let formatedTWA = (Utilities.formatDate(twoWeeksAgo, 'America/New_York', 'MM/dd/yyyy')).toString();
  let formatedOWA = (Utilities.formatDate(oneWeekAgo, 'America/New_York', 'MM/dd/yyyy')).toString();

  qstring = "SELECT card, purchaseamount, merchantdetails, date, depdate, " +
    "time, ccpay, subject, purchrange, day_of_the_week " +
    "FROM cardtrans.financetrackingraw " +
    //"WHERE date_parse(date,'%m/%d/%Y') >= date_parse('" + formatedTWA + "','%m/%d/%Y') " +
    "WHERE date_parse(date,'%m/%d/%Y') >= date_parse('" + formatedOWA + "','%m/%d/%Y') " +
    "GROUP BY card, purchaseamount, merchantdetails, date, depdate, " +
    "time, ccpay, subject, purchrange, day_of_the_week";
  
  data = {
    'query' : qstring
  }

  options = {
    'payload': JSON.stringify(data),
    'headers': headers
  };

  response = UrlFetchApp.fetch('https://ly3uajvsh0.execute-api.us-east-1.amazonaws.com/default/TransactionProcessor_step2', options);

  rdata = JSON.parse(response.getContentText());

  var queryExecutionId2 = rdata["QueryExecutionId"];
  
  Logger.log(queryExecutionId2);

  Utilities.sleep(2 * 1000);

  s4_getAthenaResults2(queryExecutionId,queryExecutionId2,depDate);
}

function s4_getAthenaResults2(queryExecutionId,queryExecutionId2,depDate) {
  Logger.log('s4_getAthenaResults2')
  // Gets Athena results via TransactionProcessor_step3 lambda
  var formData = {
    'queryExecutionId': queryExecutionId,
    'depDate': depDate
  };

  var apiJawn = apiKey
  
  var headers = {
    "x-api-key": apiJawn
  }; 

  var options = {
    'payload': JSON.stringify(formData),
    'headers': headers
  };

  Logger.log(options)
  var response = UrlFetchApp.fetch('https://9g1falkc01.execute-api.us-east-1.amazonaws.com/default/TransactionProcessor_step3', options);
  var emailBodytxt = JSON.parse(response.getContentText());

  s5_grabBoxPlot(emailBodytxt,queryExecutionId2)
}

function s5_grabBoxPlot(emailBodytxt,queryExecutionId2) {
  Logger.log('s5_grabBoxPlot')
  var url = 'https://1ffccx3cgg.execute-api.us-east-1.amazonaws.com/default/TransactionProcessor_test';
  
  var queryExecutionId = queryExecutionId2;

  var plotNeeded = 'barNeeded';

  var headers = {
    "x-api-key": apiKey
  }; 

  var formData = {
    'queryExecutionId': queryExecutionId,
    'plotNeeded': plotNeeded
  };

  var options = {
    'payload': JSON.stringify(formData),
    'headers': headers
  };

  Logger.log(options)

  var response = UrlFetchApp.fetch(url, options);
  var boxBlob = response.getBlob(); // Get the image as a blob

  s6_grabBarPlot(queryExecutionId2,emailBodytxt,boxBlob)
}

function s6_grabBarPlot(queryExecutionId2,emailBodytxt,boxBlob) {
  Logger.log('s6_grabBarPlot')
  var url = 'https://1ffccx3cgg.execute-api.us-east-1.amazonaws.com/default/TransactionProcessor_test';
  
  var queryExecutionId = queryExecutionId2;

  var plotNeeded = 'barNeeded1';

  var headers = {
    "x-api-key": apiKey
  }; 

  var formData = {
    'queryExecutionId': queryExecutionId,
    'plotNeeded': plotNeeded
  };

  var options = {
    //'contentType': 'application/json',
    'payload': JSON.stringify(formData),
    'headers': headers
  };

  Logger.log(options)

  var response = UrlFetchApp.fetch(url, options);
  var barBlob = response.getBlob(); // Get the image as a blob

  s7_sendEmail(emailBodytxt,barBlob,boxBlob)
}

//note change email for production

function s7_sendEmail(emailBodytxt, barBlob, boxBlob) {
  Logger.log('s7_sendEmail')

  // Replace 'recipient_email_address' with the email address where you want to send the email
  var recipientEmail = 'cobrien2442@gmail.com';
  var subject = 'Card transaction';
  var body = emailBodytxt + '<br/><br/>Please find the images below: <br/><img src="cid:barImage" width="200"><br/><img src="cid:boxImage" width="200">';

  MailApp.sendEmail({
    to: recipientEmail,
    subject: subject,
    htmlBody: body,
    inlineImages: {
      barImage: barBlob, // Attach the barBlob as an inline image with CID 'barImage'
      boxImage: boxBlob // Attach the boxBlob as an inline image with CID 'boxImage'
    }
  });
}