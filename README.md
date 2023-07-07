

**Offline Usage**

(1) Install MySql Server (https://dev.mysql.com/downloads/workbench/)

(2) Install MySqlWorkbench (https://www.mysql.com/products/workbench/)

(3) Change config.js to the credentials previously setup

(4) Run migrations (node_modules/.bin/sequelize db:migrate)



**Online Usage**

(1)
npm install -g heroku-cli and set an heroku account online

(2) 
Setting up heroku
heroku login
Enter your Heroku credentials from the account created previously
Email: adam@example.com
Password (typing will be hidden):
Authentication successful.

(3)
 - cd ~/myapp
 - $ heroku create
 - Creating app... done, ⬢ <app-name>
 - https://<app-name>.herokuapp.com/ | https://git.heroku.com/<app-name>.git
	
(4)
Connect to the server
 - heroku git:remote moneymanagingbackend (this can be change in heroku)

(5)
Adding add-ons

 - Under the settings tab of the application, any add-ons can be added to support the application(Add clear db)
 
 - heroku config | grep CLEARDB_DATABASE_URL
	 - **OUTPUT** - CLEARDB_DATABASE_URL: mysql://bffca8d7eb65d8:123456@us-cdbr-iron-east-04.cleardb.net/heroku_8763abf826195bc?reconnect=true\
		
	 - **OUTPUT EXPLAINED** - bffca8d7eb65d8 -> **username**, 123456->**password**, us-cdbr-iron-east-04.cleardb.net — > **server**

(6) 
 - Change door to 5000 in index.js because 3000 is occupied in heorku
            Add this on package.json
            		"scripts": {
    				 "start": "node index.js",
   					 "start:dev": "nodemon index.js"
},  
 - git add, git commit , git push heroku master


(7) Run migrations (aka create tables on the database)

**Create migration :** node_modules/.bin/sequelize migration:create --name=create-users

**Populate migration with data** (See examples inside the project)

**Execute all migration's :** node_modules/.bin/sequelize db:migrate

**Run this query in the datbaase to allow GROUP BY clause to be contained in nonaggregated column** : SET GLOBAL sql_mode=(SELECT REPLACE(@@sql_mode,'ONLY_FULL_GROUP_BY',''));

(8) Make database migrations (TODO)


Any doubts access this URL (https://medium.com/@dharinij.it/deploying-existing-nodejs-app-in-heroku-server-f0c82dace584)
