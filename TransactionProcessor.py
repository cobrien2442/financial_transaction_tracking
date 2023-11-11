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
      
    card = body['Card']
    purchase_amount = body['Purchaseamount']
    merchant_details = body['Merchantdetails']
    date1 = body['date']
    depDate = body['depDate']
    upLoadDateTime = body['upDate']
    
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
    
    intDatetime = body['date'][:-11]
    dateClean = body['date'][:-20]
    upDateClean = body['upDate']
    year = dateClean[6:]
    month = dateClean[:-8]
    day = dateClean[3:5]
    time = body['date'][11:19]
    
    intibody = json.dumps(body)
    
    timeFormat = '%m/%d/%Y %I:%M %p'
    
    timeObj01 = datetime.strptime(intDatetime, timeFormat)
    
    timeObj = timeObj01 + timedelta(hours=3)
    
    upDateClean = upDateClean.replace("-","")
    upDateClean = upDateClean.replace(":","")
    upDateClean = upDateClean.replace(":","")
    upDateClean = upDateClean.replace(".","")
    
    # Create a dictionary with the formatted datetime
    data = {'intDatetime': intDatetime, 'datetimestamp': timeObj.strftime('%m/%d/%Y %I:%M %p'), 'datestamp': timeObj.strftime('%m/%d/%Y'), 'timestamp': timeObj.strftime('%I:%M %p')}
    
    body['date'] = timeObj.strftime('%m/%d/%Y')
    body['time'] = timeObj.strftime('%I:%M %p')
    
    bucket = "financetrackingraw"
    fileName = str(upDateClean) + ".json"
    
    s3 = boto3.resource('s3')
    
    s3object = s3.Object(bucket, fileName)

    s3object.put(
        Body=(bytes(json.dumps(body).encode('UTF-8')))
    )    
    
    return {
        'statusCode': 200,
        'intialbody': intibody
    }