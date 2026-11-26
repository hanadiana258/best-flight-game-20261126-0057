import sys
sys.path.insert(0,'/root/restore-staging/home/agentuser/tzero/.venv/lib/python3.12/site-packages')
from playwright.sync_api import sync_playwright
import time, os
out='screenshots'
os.makedirs(out,exist_ok=True)
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/root/.cache/ms-playwright/chromium-1148/chrome-linux/chrome',args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1280,'height':720},device_scale_factor=1)
    errors=[]; page.on('console',lambda m: errors.append('console:'+m.text) if m.type=='error' else None); page.on('pageerror',lambda e: errors.append('pageerror:'+str(e)))
    page.goto('http://127.0.0.1:8080'); page.wait_for_load_state('networkidle'); page.screenshot(path=out+'/1-title.png')
    page.keyboard.press('Enter'); page.wait_for_timeout(1800); page.screenshot(path=out+'/2-chase.png')
    page.keyboard.press('v'); page.wait_for_timeout(500); page.screenshot(path=out+'/3-cockpit.png')
    page.keyboard.down('w'); page.wait_for_timeout(1200); page.keyboard.up('w'); page.keyboard.press('d'); page.wait_for_timeout(900); page.screenshot(path=out+'/4-approach.png')
    page.keyboard.press('r'); page.keyboard.press('Enter'); page.wait_for_timeout(400)
    print('errors=',errors)
    print('title=',page.locator('#title').get_attribute('class'))
    print('canvas=',page.locator('canvas').count())
    browser.close()
