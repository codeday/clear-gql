FROM node:14-alpine

ENV NODE_ENV=production
RUN mkdir /app
COPY yarn.lock /app
COPY package.json /app
WORKDIR /app

RUN NODE_ENV=development yarn install
COPY . /app
RUN yarn run build
RUN npm run start
