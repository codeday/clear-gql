FROM node:20-alpine3.18

ENV NODE_ENV=production
RUN apk add --no-cache postgresql-client openssl1.1-compat
RUN mkdir /app
COPY yarn.lock /app
COPY package.json /app
WORKDIR /app

RUN NODE_ENV=development yarn install
COPY . /app

RUN npx prisma generate
RUN yarn run build

CMD npm run start
