import { analysisTask } from './tasks';
self.onmessage = async ({ data }) => {
  try { const result = await analysisTask(data.type, data.payload, (progress) => self.postMessage({ progress })); self.postMessage({ result }); }
  catch (error) { self.postMessage({ error: error.message }); }
};
