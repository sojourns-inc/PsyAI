FROM node:latest

RUN mkdir /PsyAI
ADD . /PsyAI
WORKDIR /PsyAI

RUN npm install
RUN npx tsc

ENV DISCORD_TOKEN ""
CMD DISCORD_TOKEN="$DISCORD_TOKEN" node ./dist/bot.js
