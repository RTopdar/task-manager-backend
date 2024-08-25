
# Task Manager Backend

A node js server for the Task Manager application made using Node.js and Express.js


## Authors

- [@RTopdar](https://www.github.com/RTopdar)


## Get Started

After cloning the repo, run the following commands
 - npm i
 - npm run dev
This will start the development server using nodemon where you can check and test the application
    


## Deployment

This project is stored as a Docker container in Google Cloud Platform's Artifact registry.

It is hosted using Google Cloud Run - a serverless platform well known for running containerized applications

To host the application, run the following commands (**NOTE**: All the scripts are written in .sh files. So you need to have WSL or git bash installed if using Windows)


- To create the docker container
```bash
  ./build.sh
```

- To push the docker container to Google Artifact Registry
```bash
  ./push.sh
```

- To deploy the application to Google Cloud Run
```bash
  ./deploy.sh
```


## Running Tests

To run tests, run the following command

```bash
  npx mocha
```

