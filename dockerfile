FROM node:20.11.1

# set Timezone
ENV TZ=Asia/Jakarta
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ /etc/timezone

# Setting working directory. All the path will be relative to WORKDIR
WORKDIR /usr/src/chat-apps

# Installing project files
copy ./ ./
RUN npm install sqlite sqlite3
RUN npm install

#expose Port
EXPOSE 3001

#Running the app
CMD ["node", "./index.js"]
