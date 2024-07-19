
// 输出树形结构
// document.addEventListener('DOMContentLoaded', function() {
//   chrome.bookmarks.getTree(function(bookmarkTreeNodes) {
//       const bookmarksTree = buildBookmarksTree(bookmarkTreeNodes);
//       console.log(bookmarksTree);
//   });

//   chrome.history.search({ text: '', maxResults: 10 }, function(historyItems) {
//       const recentItems = historyItems.map(item => ({
//           title: item.title || item.url,
//           url: item.url
//       }));
//       console.log(recentItems);
//   });

//   chrome.tabs.query({}, function(tabs) {
//       const tabsList = tabs.map(tab => ({
//           title: tab.title || tab.url,
//           url: tab.url,
//           windowId: tab.windowId,
//           tabId: tab.id
//       }));
//       console.log(tabsList);
//   });
// });

// function buildBookmarksTree(bookmarkNodes) {
//   return bookmarkNodes[0].children.map(node => buildNode(node));
// }

// function buildNode(node) {
//   if (node.children) {
//       return {
//           title: node.title,
//           children: node.children.map(child => buildNode(child))
//       };
//   } else {
//       return {
//           title: node.title,
//           url: node.url
//       };
//   }
// }


document.addEventListener('DOMContentLoaded', function() {
  // 当页面加载完成时执行，获取书签树和最近浏览历史

  chrome.bookmarks.getTree(function(bookmarkTreeNodes) {
    const bookmarksContainer = document.getElementById('navs-container');
    const sortedFolders = sortBookmarksByLinkCount(bookmarkTreeNodes[0].children);
    displayBookmarks(sortedFolders, bookmarksContainer);

    // 默认显示链接数量最多的目录的链接
    if (sortedFolders.length > 0) {
        const firstFolder = sortedFolders[0];
        renderLinks(firstFolder.children);

        // 给第一个目录添加选中状态
        const firstFolderElement = bookmarksContainer.querySelector('.parent div');
        if (firstFolderElement) {
            firstFolderElement.classList.add('selected');
        }
    }


    chrome.history.search({ text: '', maxResults: 10 }, function(historyItems) {
      const recentContainer = document.getElementById('recent');
      displayRecent(historyItems, recentContainer);
    });
});

  // chrome.history.search({text: '', maxResults: 10}, function(historyItems) {
  //   // 搜索最近浏览历史，获取最多10条记录
  //   const recentContainer = document.getElementById('recent');
  //   displayRecent(historyItems, recentContainer);
  // });

  chrome.tabs.query({}, function(tabs) {
    // 获取当前所有标签页
    const tabsContainer = document.getElementById('tabs');
    displayTabs(tabs, tabsContainer);
  });



  // 函数获取所有书签
  function getBookmarks() {
      return new Promise((resolve, reject) => {
          chrome.bookmarks.getTree((bookmarkTreeNodes) => {
              if (chrome.runtime.lastError) {
                  reject(chrome.runtime.lastError);
              } else {
                  resolve(bookmarkTreeNodes);
              }
          });
      });
  }


  // 对书签执行模糊搜索
  function searchBookmarks(bookmarks, query) {
      let results = [];

      function searchNode(node) {
          if (node.url && node.title.toLowerCase().includes(query)) {
              results.push({ title: node.title, url: node.url });
          }
          if (node.children) {
              node.children.forEach(searchNode);
          }
      }

      bookmarks.forEach(searchNode);
      return results;
  }

  // 输入框输入内容
  const input = document.getElementById('search-input');
  input.addEventListener('input', async() => {
    // 遍历收藏夹正则搜索
    try {
        const bookmarks = await getBookmarks();
        const results = searchBookmarks(bookmarks, input.value);
        // 显示组件
        let html = ''
        results.map((item,index) => {
          html += `
            <li>
              <img src="${'https://logo.clearbit.com/'+new URL(item.url).hostname}" alt="">
              <a target="_blank" href="${item.url}">${item.title}</a>
            </li>
          `
        })
        document.getElementById('search-results').innerHTML = html
        document.getElementById('search-view').style.display = 'block';
    } catch (error) {
        console.error('Error fetching bookmarks:', error);
    }
  });

  // 点空白处关闭搜索窗口
  document.addEventListener('click', function(event) {
    if (event.target.id !=='search-view' || event.target.id !=='search-input') {
      document.getElementById('search-view').style.display = 'none';
    }
  })

});
  
// 计算文件夹下链接数量
function countLinks(node) {
  let count = 0;
  if (node.children) {
      node.children.forEach(function(child) {
          if (child.url) {
              count++;
          } else if (child.children) {
              count += countLinks(child);
          }
      });
  }
  return count;
}


// 按链接数量排序
function sortBookmarksByLinkCount(bookmarkNodes) {
  return bookmarkNodes.filter(node => node.children).sort((a, b) => countLinks(b) - countLinks(a));
}


// 导航渲染
function displayBookmarks(bookmarkNodes, container) {
  bookmarkNodes.forEach(function(node) {
    if(node.children && node.children.length > 0){

      const li = document.createElement('li');
      li.classList.add('parent');

      const div = document.createElement('div');
      const i = document.createElement('i');
      const img = document.createElement('img');
      img.src = './public/file.svg';
      img.alt = '';
      i.className = 'icon';
      i.appendChild(img);

      const span = document.createElement('span');
      span.textContent = node.title+' ('+countLinks(node)+')';

      div.appendChild(i);
      div.appendChild(span);

      div.addEventListener('click', function(event) {
        event.stopPropagation();
        removeSelectedClass(container); // 移除其他选中状态
        div.classList.add('selected'); // 设置当前项为选中状态

        if (countLinks(node) > 0) {
          if (typeof renderLinks === 'function') {
            renderLinks(node.children);
          } else {
            console.error('renderLinks is not defined');
          }
        } else {
          Qmsg.info('没有链接')
        }
      });

      li.appendChild(div);
      

      if (node.children && node.children.length > 0) {
        const nestedUl = document.createElement('li');
        nestedUl.classList.add('nested');
        displayBookmarks(node.children, nestedUl);
        li.appendChild(nestedUl);
      }
  

      container.appendChild(li);
    }
  });
}

// 移除导航选中状态
function removeSelectedClass(container) {
  const selectedElements = document.querySelectorAll('.selected');
  selectedElements.forEach(function(el) {
    el.classList.remove('selected');
  });
}



// 显示文件夹下的链接
function renderLinks(bookmarkNodes) {
  const bookmarksContainer = document.getElementById('bookmarks-container');
  const ul = bookmarksContainer.querySelector('ul');
  ul.innerHTML = ''; // 清空容器内容

  let hasLinks = false;

  bookmarkNodes.forEach(function(node) {
      if (!node.children && node.url) {
          hasLinks = true;
          const li = document.createElement('li');

          const i = document.createElement('i');
          const img = document.createElement('img');
          img.src = 'https://logo.clearbit.com/' + new URL(node.url).hostname; // 使用链接的favicon或默认图标
          // 加载出错默认图标
          img.onerror = function() {
              img.src = './public/link.png';
          };
          img.alt = '';
          i.appendChild(img);

          const div = document.createElement('div');
          const h3 = document.createElement('h3');
          h3.textContent = node.title || 'Untitled';
          const p = document.createElement('p');
          p.textContent = node.url;

          div.appendChild(h3);
          div.appendChild(p);

          li.appendChild(i);
          li.appendChild(div);

          li.addEventListener('click', function() {
              // 移除之前的选中状态
              const selectedElement = ul.querySelector('.nested .selected');
              if (selectedElement) {
                  selectedElement.classList.remove('selected');
              }

              // 添加当前的选中状态
              li.classList.add('selected');

              window.open(node.url)
          });

          ul.appendChild(li);
      }
  });
}


// 显示当前标签页
function displayTabs(tabs, container) {
  tabs.forEach(function(tab) {
      const li = document.createElement('li');
      li.className = 'tab-item';

      const img = document.createElement('img');
      img.src = tab.favIconUrl || './public/link.png'; // 使用标签页的favicon或默认图标
      img.alt = '';

      const p = document.createElement('p');
      p.textContent = tab.title || 'Untitled Tab'; // 使用标签页的标题或默认标题

      li.appendChild(img);
      li.appendChild(p);

      li.addEventListener('click', function() {
          chrome.windows.update(tab.windowId, { focused: true }, function() {
              chrome.tabs.update(tab.id, { active: true });
          });
      });

      container.appendChild(li);
  });
}

// 显示最近浏览历史
function displayRecent(historyItems, container) {
  const ul = container.querySelector('ul');
  ul.innerHTML = ''; // 清空容器内容

  historyItems.forEach(function(item) {
      const li = document.createElement('li');

      const i = document.createElement('i');
      const img = document.createElement('img');
      img.src = 'https://logo.clearbit.com/'+new URL(item.url).hostname
      // 加载出错默认图标

      img.onerror = function() {
        img.src = './public/link.png';  
      }
      img.alt = '';
      i.appendChild(img);

      const p = document.createElement('p');
      p.textContent = item.title || item.url;

      li.appendChild(i);
      li.appendChild(p);

      li.addEventListener('click', function() {
          window.open(item.url)
      });

      ul.appendChild(li);
  });
}


// 显示书签
function displayTabs(tabs, container) {
  tabs.forEach(function(tab) {
    const li = document.createElement('li');
    li.className = 'tab-item';

    const img = document.createElement('img');
    img.src = tab.favIconUrl || './public/link.png'; // 使用标签页的favicon或默认图标
    img.alt = '';

    const p = document.createElement('p');
    p.textContent = tab.title || 'Untitled Tab'; // 使用标签页的标题或默认标题

    li.appendChild(img);
    li.appendChild(p);

    li.addEventListener('click', function() {
      chrome.windows.update(tab.windowId, { focused: true }, function() {
        chrome.tabs.update(tab.id, { active: true });
      });
    });

    container.appendChild(li);
  });
}