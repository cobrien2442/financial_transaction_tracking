import json
import logging
import boto3
from botocore.exceptions import ClientError
import os
from datetime import datetime, timedelta

card = 0
purchase_amount = 0
merchant_details = 'jawn_Store'
date1 = 0
upDate = 0
depDate = 0

def lambda_handler (event, context):
    
    print (event)
    
    body = json.loads(event['body'])
    
    return {
        'statusCode': 200,
        'body':json.dumps(toS3(body))
    }

def toS3(body):
 
    result = {}
    time = {}
    dateClean = {}
    upDateClean = {}
    year = {}
    month = {}
    day = {}
    
    intibody = json.dumps(body)
    
    intPurch = float(body['Purchaseamount'])
    if intPurch <= 10:
        body['purchRange'] = 'sml'
    elif intPurch > 10 and intPurch <= 100:
        body['purchRange'] = 'med'
    elif intPurch > 100 and intPurch <= 999:
        body['purchRange'] = 'lrg'
    elif intPurch >= 1000:
        body['purchRange'] = 'xlrg'
        

    upDateClean = body['upDate']
    upDateClean = upDateClean.replace("-","")
    upDateClean = upDateClean.replace(":","")
    upDateClean = upDateClean.replace(":","")
    upDateClean = upDateClean.replace(".","")
    
    fileName = str(upDateClean) + ".json"
    bucket = "financetrackingraw"
    bucket2 = "financetrackingraw2"
    s3 = boto3.resource('s3')
    s3object = s3.Object(bucket, fileName)
    s3object2 = s3.Object(bucket2, fileName)
    
    if (body['ccPay'] == 0 or body['ccPay'] == 3):
        intDatetime = body['date'][:-11]
        dateClean = body['date'][:-20]
        year = dateClean[6:]
        month = dateClean[:-8]
        day = dateClean[3:5]
        time = body['date'][11:19]
        
        timeFormat = '%m/%d/%Y %I:%M %p'
        
        timeObj01 = datetime.strptime(intDatetime, timeFormat)
        
        timeObj = timeObj01 + timedelta(hours=3)
        
        body['date'] = timeObj.strftime('%m/%d/%Y')
        body['time'] = timeObj.strftime('%I:%M %p')
        body['day_of_the_week'] = timeObj.strftime('%A')
    
        s3object.put(
            Body=(bytes(json.dumps(body).encode('UTF-8')))
        )    
        
        return {
            'statusCode': 200,
            #'intialbody': intibody
            'body': body
        }
        
    if body['ccPay'] == 1:
        
        intDatetime = body['date']
        
        timeFormat = '%m/%d/%Y %I:%M %p'
        
        timeObj = datetime.strptime(intDatetime, timeFormat)
        
        body['date'] = timeObj.strftime('%m/%d/%Y')
        body['time'] = timeObj.strftime('%I:%M %p')
        body['day_of_the_week'] = timeObj.strftime('%A')
    
        s3object.put(
            Body=(bytes(json.dumps(body).encode('UTF-8')))
        )    
        
        return {
            'statusCode': 200,
            #'intialbody': intibody
            'body': body
        }

    if body['ccPay'] == 4:

        s3object2.put(Body=(bytes(json.dumps(body).encode('UTF-8'))))

        if body['Card'] == 'ACH' and body['Purchaseamount'] < 3000:
            # make sure below matches db schema

            #formats_to_check = ['%m/%d','%d%m%y','%d%m%Y','%m/%d/%Y','%m%d','%m%d%Y','%y%m%d']  # Define the date formats to check
            #will need to fix code to run above line, code will run below line for now
            formats_to_check = ['%m/%d/%Y %I:%M %p']  # Define the date formats to check

            for date_format in formats_to_check:
                try:
                    date_obj = datetime.strptime(body['date'], date_format)
                    # Check if the date is within 30 days of the current date
                    today = datetime.now()
                    thirty_days_ago = today - timedelta(days=30)
                    #if thirty_days_ago <= date_obj <= today:
                    if thirty_days_ago <= date_obj <= today:
                        #s3object.put(Body=(bytes(json.dumps(body).encode('UTF-8'))))
                        intDatetime = body['date']
                        timeFormat = date_format
                        timeObj = datetime.strptime(intDatetime, timeFormat)

                    
                        body['date'] = timeObj.strftime('%m/%d/%Y')
                        body['time'] = timeObj.strftime('%I:%M %p')
                        body['day_of_the_week'] = timeObj.strftime('%A')
                        
                        s3object.put(Body=(bytes(json.dumps(body).encode('UTF-8'))))
                        
                        return {
                            'statusCode': 200,
                            # 'initialbody': intibody
                            'body': body
                        }
                    
                        
                except ValueError:
                        pass
        
        else:
        
            return {
                'statusCode': 200,
                # 'initialbody': intibody
                'body': body
            }