import io
import json
import base64
import boto3
from matplotlib import pyplot as plt
import seaborn as sns
import pandas as pd
from datetime import datetime


def lambda_handler(event, context):

    binary_data = event['body']

    decoded_data = base64.b64decode(binary_data)
    decoded_string = decoded_data.decode('utf-8') 

    decoded_json = json.loads(decoded_string)

    if 'queryExecutionId' in decoded_json:
        queryExecutionId = decoded_json['queryExecutionId']

        # Your existing code to fetch data and create the plot...
        client = boto3.client('athena')
        queryID = queryExecutionId
        results = client.get_query_results(QueryExecutionId = queryID)
        
        json_string = json.dumps(results)

        # Parse the JSON string
        data = json.loads(json_string)

        # Extracting purchase amounts and days of the week
        data_rows = data['ResultSet']['Rows']
        card_values = [row['Data'][0]['VarCharValue'] for row in data_rows[1:]]
        purchase_amounts = [float(row['Data'][1]['VarCharValue']) for row in data_rows[1:]]
        merchant_details = [row['Data'][2]['VarCharValue'] for row in data_rows[1:]]
        dates = [row['Data'][3]['VarCharValue'] for row in data_rows[1:]]
        updates = [row['Data'][4]['VarCharValue'] for row in data_rows[1:]]
        dep_dates = [row['Data'][5]['VarCharValue'] for row in data_rows[1:]]
        times = [row['Data'][6]['VarCharValue'] for row in data_rows[1:]]
        cc_pay_values = [float(row['Data'][7]['VarCharValue']) for row in data_rows[1:]]
        subject_values = [row['Data'][8]['VarCharValue'] for row in data_rows[1:]]
        purchase_range_values = [row['Data'][9]['VarCharValue'] for row in data_rows[1:]]
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

        plt.bar(days, totals, color='skyblue')
        plt.xlabel('Day of the Week')
        plt.ylabel('Total Purchase Amount')
        plt.title('Total Purchase Amount per Day of the Week')
        plt.xticks(rotation=45)
        plt.tight_layout()

        # Save the first plot to a BytesIO object
        buffer = io.BytesIO()
        plt.savefig(buffer, format='png')
        buffer.seek(0)
        image_bytes = buffer.getvalue()
        encoded_image = base64.b64encode(image_bytes).decode('utf-8')

        time_values = [datetime.strptime(time, '%I:%M %p').hour for time in times]

        # Convert 'dates' to datetime objects
        date_objects = [datetime.strptime(date, '%m/%d/%Y') for date in dates]

        # Convert days_of_week to numerical values
        #numerical_days = [day_map[day] for day in days_of_week]

        data_dict = {
            'Card': card_values,
            'PurchaseAmount': purchase_amounts,
            'Date': date_objects,
            'Update': updates,
            'DepDate': dep_dates,
            'Time': time_values,
            'Subject': subject_values,
            'PurchRange': purchase_range_values,
            'DayOfWeek': days_of_week
        }

        df = pd.DataFrame(data_dict)

        # Count occurrences of each date and create a new column 'DateCount'
        df['DayNumOfTrans'] = df['Date'].map(df['Date'].value_counts())
        df['TimeCount'] = df['Time'].map(df['Time'].value_counts())

        # Creating Seaborn boxplot
        plt.figure()  # Create a new figure for Seaborn plot
        sns.boxplot(data=df, y="PurchaseAmount", x="DayOfWeek")

        # Save the Seaborn plot to a BytesIO object
        buffer = io.BytesIO()
        plt.savefig(buffer, format='png')
        buffer.seek(0)
        image_bytes2 = buffer.getvalue()
        encoded_image2 = base64.b64encode(image_bytes2).decode('utf-8')

        return {
            'statusCode': 200,
            #'isBase64Encoded': False,
            'isBase64Encoded': True,
            #'headers': {"Content-Type": "application/json"},
            'headers': {"Content-Type": "image/png"},
            #try 1 == > "body": json.dumps("{\"bar\": \"encoded_image\", \"box\": \"encoded_image2\"}")
            #try 2 == > "body": json.dumps("{\"bar\": \encoded_image\, \"box\": \encoded_image2\}")
            'body': encoded_image2
        }