const kue = require('kue');
const queue = kue.createQueue();

const addJob = (queueName, jobData) => {
  const job = queue.create(queueName, jobData).save((err) => {
    if (!err) console.log(`Job ${job.id} added to queue ${queueName}`);
  });
};

module.exports = { addJob, queue };

