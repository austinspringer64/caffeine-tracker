export default [
    {
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "script",
            globals: {
                window: "readonly",
                document: "readonly",
                console: "readonly",
                localStorage: "readonly",
                alert: "readonly",
                confirm: "readonly",
                Chart: "readonly",
                navigator: "readonly",
            },
        },
        rules: {
            "no-unused-vars": "warn",
            "no-console": "warn",
            "eqeqeq": "error",
            "no-var": "error",
            "prefer-const": "warn",
            "semi": ["error", "always"],
            "indent": ["warn", 4],
            "quotes": ["warn", "single"],
            "curly": "error",
        },
    },
];
