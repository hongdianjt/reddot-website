const fs=require('node:fs');
const path=require('node:path');
const localJava=path.resolve(__dirname,'../.tools/jdk/bin/java');
const javaExecutable=process.env.JAVA_HOME?path.join(process.env.JAVA_HOME,'bin/java'):(fs.existsSync(localJava)?localJava:'java');

module.exports={apps:[{
  name:'reddot-website',
  script:javaExecutable,
  args:['-jar','runtime/reddot-backend.jar'],
  interpreter:'none',
  cwd:__dirname,
  instances:1,
  exec_mode:'fork',
  env:{PORT:3000,WEB_ROOT:__dirname,SEED_FILE:path.join(__dirname,'data/site.json')}
}]};
