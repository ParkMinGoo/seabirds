(function(root){
'use strict';
const DB_NAME='seabirds_logbook',DB_VERSION=2;
let persistedDiveVersions=new Map();

function requestResult(request){return new Promise((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)})}
function transactionDone(transaction){return new Promise((resolve,reject)=>{transaction.oncomplete=resolve;transaction.onerror=()=>reject(transaction.error);transaction.onabort=()=>reject(transaction.error||new Error('Database transaction aborted'))})}
function open(){return new Promise((resolve,reject)=>{const request=indexedDB.open(DB_NAME,DB_VERSION);request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains('dives'))db.createObjectStore('dives',{keyPath:'id'});if(!db.objectStoreNames.contains('settings'))db.createObjectStore('settings');if(!db.objectStoreNames.contains('equipment'))db.createObjectStore('equipment');if(!db.objectStoreNames.contains('metadata'))db.createObjectStore('metadata');if(!db.objectStoreNames.contains('media')){const media=db.createObjectStore('media',{keyPath:'id'});media.createIndex('diveId','diveId',{unique:false})}};request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)})}

async function load(){
 const db=await open(),tx=db.transaction(['dives','settings','equipment','metadata'],'readonly'),divesRequest=tx.objectStore('dives').getAll(),settingsRequest=tx.objectStore('settings').get('preferences'),equipmentRequest=tx.objectStore('equipment').get('master'),metadataRequest=tx.objectStore('metadata').get('state');
 const [dives,settings,gearLibrary,metadata]=await Promise.all([requestResult(divesRequest),requestResult(settingsRequest),requestResult(equipmentRequest),requestResult(metadataRequest)]);
 await transactionDone(tx);db.close();
 persistedDiveVersions=new Map(dives.map(dive=>[dive.id,String(dive.updatedAt||'')]));
 return {dives,settings:settings||{},gearLibrary:gearLibrary||{},diveGroups:Array.isArray(metadata?.diveGroups)?metadata.diveGroups:[],deletedDiveIds:metadata?.deletedDiveIds||[],revision:metadata?.revision||0,updatedAt:metadata?.updatedAt||''};
}

let writeQueue=Promise.resolve();
function save(state){
 writeQueue=writeQueue.catch(()=>{}).then(async()=>{
  const db=await open(),tx=db.transaction(['dives','settings','equipment','metadata'],'readwrite'),divesStore=tx.objectStore('dives'),incoming=new Set();
  for(const dive of state.dives||[]){const version=String(dive.updatedAt||'');incoming.add(dive.id);if(persistedDiveVersions.get(dive.id)!==version)divesStore.put(dive);persistedDiveVersions.set(dive.id,version)}
  for(const id of [...persistedDiveVersions.keys()])if(!incoming.has(id)){divesStore.delete(id);persistedDiveVersions.delete(id)}
  tx.objectStore('settings').put(state.settings||{},'preferences');
  tx.objectStore('equipment').put(state.gearLibrary||{},'master');
  tx.objectStore('metadata').put({diveGroups:Array.isArray(state.diveGroups)?state.diveGroups:[],deletedDiveIds:state.deletedDiveIds||[],revision:state.revision||0,updatedAt:state.updatedAt||''},'state');
  await transactionDone(tx);db.close();
 });
 return writeQueue;
}

function blobBuffer(blob){
 if(blob?.arrayBuffer)return blob.arrayBuffer();
 return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error||new Error('첨부 파일을 읽지 못했습니다'));reader.readAsArrayBuffer(blob)});
}
async function putMedia(item){
 const data=item.data instanceof ArrayBuffer?item.data:await blobBuffer(item.blob),stored={...item,data};
 delete stored.blob;
 const db=await open(),tx=db.transaction('media','readwrite');tx.objectStore('media').put(stored);await transactionDone(tx);db.close();return item
}
async function getMedia(diveId){
 const db=await open(),tx=db.transaction('media','readonly'),request=tx.objectStore('media').index('diveId').getAll(diveId),items=await requestResult(request);await transactionDone(tx);db.close();
 return items.map(item=>({...item,blob:item.blob instanceof Blob?item.blob:new Blob([item.data],{type:item.type||'application/octet-stream'})}))
}
async function deleteMedia(id){const db=await open(),tx=db.transaction('media','readwrite');tx.objectStore('media').delete(id);await transactionDone(tx);db.close()}
async function deleteDiveMedia(diveId){const items=await getMedia(diveId);const db=await open(),tx=db.transaction('media','readwrite'),store=tx.objectStore('media');items.forEach(item=>store.delete(item.id));await transactionDone(tx);db.close()}

async function clear(){const stores=['dives','settings','equipment','metadata','media'],db=await open(),tx=db.transaction(stores,'readwrite');for(const name of stores)tx.objectStore(name).clear();await transactionDone(tx);db.close();persistedDiveVersions.clear()}

root.SeaBirdsStorage={load,save,clear,putMedia,getMedia,deleteMedia,deleteDiveMedia};
})(window);
