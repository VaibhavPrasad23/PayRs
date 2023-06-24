FROM node:18

RUN mkdir /payr && chown -R node /payr

RUN mkdir -p /payr/api.mentor
RUN mkdir -p /payr/.npm-global

WORKDIR /payr/api.mentor

COPY --chown=payr package*.json ./

COPY --chown=payr . .

RUN chown -R node /payr/.npm-global
RUN chown -R node /payr/api.mentor
RUN chown -R node /payr/api.mentor/node_modules
RUN chown -R node /payr/api.mentor/packages/schemata
RUN chown -R node /payr/api.mentor/packages/schemata/node_modules

USER node

RUN npm config set prefix '/payr/.npm-global'

# RUN npm install -g pm2

RUN npm install --omit=dev

ENV HOST=0.0.0.0 PORT=3000

EXPOSE ${PORT}

CMD ["npm","run","prod:runtime"]