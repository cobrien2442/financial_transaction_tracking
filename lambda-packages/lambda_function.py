import io
import json
import base64
import boto3
from matplotlib import pyplot as plt

def lambda_handler(event, context):
    # Your existing code to fetch data and create the plot...
    queryExecutionId = 'b27c6acb-b659-40df-abac-781ef585bceb'
    client = boto3.client('athena')
    queryID = queryExecutionId
    results = client.get_query_results(QueryExecutionId = queryID)
    
    json_string = json.dumps(results)

    # Parse the JSON string
    data = json.loads(json_string)

    # Extracting purchase amounts and days of the week
    data_rows = data['ResultSet']['Rows']
    purchase_amounts = [float(row['Data'][1]['VarCharValue']) for row in data_rows[1:]]
    days_of_week = [row['Data'][-1]['VarCharValue'] for row in data_rows[1:]]

    # Calculating total purchase amounts for each day
    daily_totals = {}
    for day, amount in zip(days_of_week, purchase_amounts):
        if day in daily_totals:
            daily_totals[day] += amount
        else:
            daily_totals[day] = amount
    # Create the bar chart
    days = list(daily_totals.keys())
    totals = list(daily_totals.values())

    plt.figure(figsize=(10, 6))
    plt.bar(days, totals, color='skyblue')
    plt.xlabel('Day of the Week')
    plt.ylabel('Total Purchase Amount')
    plt.title('Total Purchase Amount per Day of the Week')
    plt.xticks(rotation=45)
    plt.tight_layout()

    # Save the plot to a BytesIO object
    buffer = io.BytesIO()
    plt.savefig(buffer, format='png')
    buffer.seek(0)
    
    # Convert the buffer to bytes and encode in base64
    image_bytes = buffer.getvalue()
    encoded_image = base64.b64encode(image_bytes).decode('utf-8')

    return {
        'headers': { "Content-Type": "image/png" },
        'statusCode': 200,
        'body': encoded_image,
        'isBase64Encoded': True
    }