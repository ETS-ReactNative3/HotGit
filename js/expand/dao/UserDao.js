import React, { Component } from 'react'
import {
  AsyncStorage, DeviceEventEmitter,
} from 'react-native'

const base64 = require('base-64')
const url_star = 'https://api.github.com/user/starred/'
const url_page = 'https://api.github.com/user/starred?page='

export default class UserDao {
  constructor () {
    this.loadCurrentUser()
      .then((result) => {
        this.username = result
      })
  }

  loadCurrentUser () {
    return new Promise((resolve, reject) => {
      AsyncStorage.getItem('username', (error, result) => {
        if (result) {
          this.username = result
          resolve(result)
        } else {
          console.log(error)
        }
      }).catch(error => {
        reject(error)
      })
    })

  }

  fetchAuthenticationHeader () {
    return new Promise((resolve, reject) => {
      AsyncStorage.getItem('password', (error, result) => {
        if (error) {
          reject(error)
        } else {
          if (result) {
            try {
              let header_token = 'Basic ' + base64.encode(this.username + ':' + JSON.parse(result))
              resolve(header_token)
            } catch (e) {
              reject(e)
            }
          } else {
            reject(error)
          }
        }
      })
    })
  }

  login (username, password) {
    Promise.all(
      [AsyncStorage.setItem('username', username, (error, result) => {}),
        AsyncStorage.setItem('password', JSON.stringify(password), (error, result) => { })])
      .then(() => {
          this.username = username
          this.checkAuthentication()
            .then(response => {
              if (response.status === 200) {
                DeviceEventEmitter.emit('showLoginResult', 'Logged in')
              } else {
                AsyncStorage.removeItem('username', (error, result) => {})
                AsyncStorage.removeItem(username, (error, result) => {})
                DeviceEventEmitter.emit('showLoginResult', 'Username and password does not match. Authentication failed.')
              }
            })
        }
      )
  }

  logout () {
    if (this.username === '' || this.username == null) {
      DeviceEventEmitter.emit('showLoginResult', 'No user logged in')
      return
    }
    this.loadCurrentUser().then(
      () => {
        AsyncStorage.removeItem('password', (error, result) => {})
        AsyncStorage.removeItem('username', (error, result) => {})
      }
    )

    DeviceEventEmitter.emit('showLoginResult', 'Logged out')
  }

  /**
   * Check if authenticated
   */
  checkAuthentication () {
    return new Promise((resolve, reject) => {
      this.fetchAuthenticationHeader()
        .then(header_token => {
          let headers = new Headers()
          headers.append('Authorization', header_token)
          fetch('https://api.github.com/', {
            headers: headers,
          })
            .then((response) => {
              resolve(response)
            })
            .catch(error => {
              reject(error)
            })
        })
    })

  }

  /**
   * fetch starred repo
   */
  fetchStarredRepos (page) {
    let url = url_page + page
    return new Promise((resolve, reject) => {
      // if no user logged in
      this.loadCurrentUser().then(() => {
        if (this.username === '' || this.username == null) {
          DeviceEventEmitter.emit('showToast', 'Please Login...')
          reject()
        }
      })

      // fetch starred repos
      this.fetchAuthenticationHeader()
        .then(header_token => {
          let headers = new Headers()
          headers.append('Authorization', header_token)
          fetch(url, {
            headers: headers,
          })
            .then((response) => {
              resolve(response)
            })
            .catch(error => {
              reject(error)
            })
        })
    })
  }

  /**
   * check if repo starred
   */
  checkIfRepoStarred (repo) {
    let url = url_star + repo
    return new Promise((resolve, reject) => {
      // if no user logged in
      this.loadCurrentUser().then(() => {
        if (this.username === '' || this.username == null) {
          reject()
        }
      })
      // check if repo starred
      let url = url_star + repo
      this.fetchAuthenticationHeader()
        .then(header_token => {
          let xhr = new XMLHttpRequest()
          xhr.open('GET', url, true)

          xhr.setRequestHeader('Authorization', header_token)
          xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded')

          xhr.onreadystatechange = function () {//Call a function when the state changes.
            if (xhr.readyState === 4 && xhr.status === 204) {
              resolve(1)
            } else if (xhr.readyState === 4 && xhr.status === 404) {
              resolve(0)
            }
          }
          xhr.send()
        })
        .catch(e => {
          reject(e)
        })
    })
  }

  /**
   * Star a repo
   */
  starRepo (repo) {
    return new Promise((resolve, reject) => {
      // if no user logged in
      this.loadCurrentUser().then(() => {
        if (this.username === '' || this.username == null) {
          reject()
        }
      })

      // Star a repo
      let url = url_star + repo
      this.fetchAuthenticationHeader()
        .then(header_token => {
          let xhr = new XMLHttpRequest()
          xhr.open('PUT', url, true)

          xhr.setRequestHeader('Content-Length', 0)
          xhr.setRequestHeader('Authorization', header_token)
          xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded')

          xhr.onreadystatechange = function () {//Call a function when the state changes.
            if (xhr.readyState === 4 && xhr.status === 204) {
              resolve()
            }
          }
          xhr.send()
        })
        .catch(e => {
          reject(e)
        })
    })
  }

  /**
   * Unstar a repo
   */
  unstarRepo (repo) {
    let url = url_star + repo
    return new Promise((resolve, reject) => {
      // if no user logged in
      this.loadCurrentUser()
      if (this.username === '' || this.username == null) {
        reject()
      }

      // unstar a repo
      this.fetchAuthenticationHeader()
        .then(header_token => {
          let xhr = new XMLHttpRequest()
          xhr.open('DELETE', url, true)

          xhr.setRequestHeader('Content-Length', 0)
          xhr.setRequestHeader('Authorization', header_token)
          xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded')

          xhr.onreadystatechange = function () {//Call a function when the state changes.
            if (xhr.readyState === 4 && xhr.status === 204) {
              resolve()
            }
          }
          xhr.send()
        })
        .catch(e => {
          reject(e)
        })
    })
  }

}