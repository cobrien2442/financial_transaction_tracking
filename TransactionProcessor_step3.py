import json
import boto3
from datetime import datetime, timedelta
import csv


def lambda_handler(event, context):
    
    print (event)
    
    body = json.loads(event['body'])
    
    queryExecutionId = body['queryExecutionId']
    
    client = boto3.client('athena')
    
    queryID = queryExecutionId
    results = client.get_query_results(QueryExecutionId = queryID)

    # Extract purchaseamount values
    purchase_amounts = [float(row['Data'][1]['VarCharValue']) for row in results['ResultSet']['Rows'][1:]]
    
    # Calculate the sum
    total_sum = sum(purchase_amounts)

    # Format the sum to two decimal places
    formatted_sum = round(total_sum, 2)
    
    latest_transaction = None
    latest_datetime = None
    
    # Iterate through the rows to find the latest transaction
    for row in results['ResultSet']['Rows'][1:]:
        date = row['Data'][3]['VarCharValue']  # Assuming 'date' is at index 3
        time = row['Data'][6]['VarCharValue']  # Assuming 'time' is at index 6
        combined_datetime = f"{date} {time}"  # Combining date and time
        
        # Convert combined datetime to a datetime object for comparison
        transaction_datetime = datetime.strptime(combined_datetime, '%m/%d/%Y %I:%M %p') 
        
        # Check if this transaction is the latest
        if latest_datetime is None or transaction_datetime > latest_datetime:
            latest_datetime = transaction_datetime
            latest_transaction = {
                'purchaseamount': float(row['Data'][1]['VarCharValue']),  # Assuming 'purchaseamount' is at index 1
                'merchantdetails': row['Data'][2]['VarCharValue'],  # Assuming 'merchantdetails' is at index 2
                'combined_datetime': combined_datetime
            }
            
    #Subtrack sum spent from pay period allowance 
    allowanceLeft = 1000 - formatted_sum
    formatted_allowanceLeft = round(allowanceLeft, 2)
    
    depDate = datetime.strptime(body['depDate'], '%m/%d/%Y')
    NextdepDate = depDate + timedelta(weeks=2)
    SNextdepDate = NextdepDate.strftime('%m/%d/%Y')
    
    
    
    #create message to send to user
    message = "You've spent $" + str(formatted_sum) + " of your $1000 allowance. You have $" + str(formatted_allowanceLeft) + " left until " + SNextdepDate + "."
    message2 = " The last transaction took place at " + latest_transaction['merchantdetails'] + "  where you spent $" + str(latest_transaction['purchaseamount']) + " at " + str(latest_transaction['combined_datetime'])
    
    response = str(message) + str(message2)
    
    return {
        'statusCode': 200,
        'body': json.dumps(response)
        }