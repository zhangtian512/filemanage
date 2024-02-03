import axios from 'axios'
import Qs from 'qs'

axios.interceptors.response.use(
  response => {
    return response.data
  }
)

function ajaxRest ({
  url,
  method,
  headers = {},
  data = {},
  timeout = 10000,
  responseType = 'json',
  onUploadProgress = null,
  onDownloadProgress = null,
  canceler = null}) {

  let urlParams = {}
  let bodyData = {}
  if (method === 'GET') urlParams = {...data}
  else bodyData = data

  let config = {
    url: url,
    method: method,
    headers: {},
    params: urlParams,
    paramsSerializer: function (params) {
      return Qs.stringify(params, {arrayFormat: 'repeat'})
    },
    data: bodyData,
    timeout: timeout,
    responseType: responseType,
    withCredentials: true,
    onUploadProgress: onUploadProgress,
    onDownloadProgress: onDownloadProgress
  }

  if (data === null || data === undefined) delete config.data

  for (const key in headers) config.headers[key] = headers[key]

  if (canceler) {
    // config.cancelToken = new axios.CancelToken(c => {
    //   canceler = c
    // })
    config.cancelToken = canceler.token
  }

  return axios.request(config)
}

export default ajaxRest
