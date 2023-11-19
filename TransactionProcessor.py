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
    
    upDateClean = body['upDate']
    upDateClean = upDateClean.replace("-","")
    upDateClean = upDateClean.replace(":","")
    upDateClean = upDateClean.replace(":","")
    upDateClean = upDateClean.replace(".","")
    
    fileName = str(upDateClean) + ".json"
    bucket = "financetrackingraw"
    s3 = boto3.resource('s3')
    s3object = s3.Object(bucket, fileName)
    
    if body['ccPay'] == 0:
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
    
        s3object.put(
            Body=(bytes(json.dumps(body).encode('UTF-8')))
        )    
        
        return {
            'statusCode': 200,
            #'intialbody': intibody
            'body': body
        }