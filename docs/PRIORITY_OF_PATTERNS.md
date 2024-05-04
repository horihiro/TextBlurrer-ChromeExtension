# Priority of patterns

The matching priority of keywords/patterns depends on the order of them (i.e. the keyword /pattern in the nth row is higher priority than the one in (n+1)th row). And each text is blurred only one time. a text already blurred is not target of pattern matching.

## Example
In this example, there is the text  `abc` in a web page. 
![image](https://github.com/horihiro/TextBlurrer-ChromeExtension/assets/4566555/f2f07cf8-b641-4816-805e-5620c74968f8)

If the following patterns is set, the only `ab` is blurred because `ab` in the page is matched by the 1st keyword `ab` at first.  
The text `ab` is already blurred, so the whole text `abc` is not target of matching the pattern `abc`.

```
ab  
abc
```

![image](https://github.com/horihiro/TextBlurrer-ChromeExtension/assets/4566555/6da21199-9b23-4477-bbd7-283b5ba66a2b)

On the other hand, if the following patterns is set, the `abc` is blurred because `abc` in the page is matched by the 1st keyword `abc` .


```
abc  
ab
```

![image](https://github.com/horihiro/TextBlurrer-ChromeExtension/assets/4566555/7bb80197-8d97-4368-a842-cf5428568c5b)
