let cacheObjects = {};
// {
//     'key-1': {
//         set: 1629817194
//         exp: 1629817194
//         data: '11111'
//     }
// }

function set(key, data, second = 180) {
    if (!key) {
        throw new Error("key ")
    }
    let now = parseInt((new Date().getTime()) / 1000);
    let obj = {
        set: now,
        exp: now + second,
        data: data
    }
    cacheObjects[key] = obj;
}


function get(key) {
    let obj = getCacheObject(key);
    if (!obj) {
        return null;
    }
    return obj.data;
}

function getWithSecondDecrease(key) {

    let obj = getCacheObject(key);
    if (!obj) {
        return null;
    }
    let now = parseInt((new Date().getTime()) / 1000);
    let dec = now - obj.set;
    let data = obj.data - dec;
    if (data < 0) {
        return null;
    }
    return data;
}

function getCacheObject(key) {
    if (!cacheObjects.hasOwnProperty(key)) {
        return null;
    }
    let obj = cacheObjects[key];
    let now = parseInt((new Date().getTime()) / 1000);
    if (obj.exp > now) {
        return obj;
    }
    // console.log(`${key} exp`);
    remove(key);
    return null;
}

function remove(key) {
    delete cacheObjects[key];
    return true;
}

module.exports = {
    set,
    get,
    getCacheObject,
    getWithSecondDecrease,
    remove
}