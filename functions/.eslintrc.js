// functions/.eslintrc.js
module.exports={
  root:true,
  env:{node:true,es2020:true},
  extends:["eslint:recommended"],
  parserOptions:{ecmaVersion:2020},
  rules:{
    // Nerven ausschalten:
    "object-curly-spacing":"off",
    "max-len":"off",
    "comma-dangle":"off",
    "key-spacing":"off",
    "operator-linebreak":"off",
    "indent":["error",2],
    "quotes":["error","double",{allowTemplateLiterals:true}]
  },
  ignorePatterns:[
    "**/node_modules/**",
    "**/lib/**",
    "*.spec.*",
    ".eslintrc.js" // <- lass die Konfig in Ruhe
  ]
};
