import { Education } from './models/index.js';

try {
  console.log('Education model:', !!Education);
  console.log('Model name:', Education?.name);

  const records = await Education.findAll({
    where: { Userid: 1543 },
    order: [['created_at', 'DESC']],
  });

  console.log('SUCCESS');
  console.log('Records:', records.length);
} catch (error) {
  console.error('FULL ERROR:');
  console.error(error.stack);
}
