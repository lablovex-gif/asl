import https from 'https';

https.get('https://www.lightinthebox.com/en/index.php?main_page=advanced_search_result&inc_subcat=1&search_in_description=0&keyword=phone', {headers: {"User-Agent": "Mozilla/5.0"}}, (res) => {
  console.log('LITB:', res.statusCode, res.headers.location);
});
https.get('https://www.miniinthebox.com/en/index.php?main_page=advanced_search_result&inc_subcat=1&search_in_description=0&keyword=phone', {headers: {"User-Agent": "Mozilla/5.0"}}, (res) => {
  console.log('MITB:', res.statusCode, res.headers.location);
});
